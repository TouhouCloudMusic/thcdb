use std::error::Error;

use anyhow::Context;
use fastrace::collector::{SpanRecord, TraceId};
use fastrace::future::FutureExt;
use fastrace::prelude::{Span, SpanContext};
use sea_orm::ActiveValue::Set;
use sea_orm::{DbErr, EntityTrait};

use super::{
    create_user, find_by_id, increment_email_verification_failed_attempts,
};
use crate::features::user::NewUser;
use crate::infra::database::error::{BrokenEntityReference, DatabaseResultExt};
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::{
    flush_traces, test_connection, trace_records,
};

#[tokio::test]
async fn missing_email_verification_keeps_its_cause_and_operation_context()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let tx = conn.begin().await?;
    let user = MockUser::with_label("missing_email_verification")
        .insert(&tx)
        .await?;

    let result =
        increment_email_verification_failed_attempts(&tx, user.id).await;
    tx.rollback().await?;
    let error = result.err().context("missing verification should fail")?;

    let message = error.to_string();
    assert!(
        message.contains("auth.increment_email_verification_failed_attempts")
    );
    assert!(message.contains("features/auth/repo.rs:"));
    let mut source: &(dyn Error + 'static) = &error;
    while let Some(cause) = source.source() {
        source = cause;
    }
    let cause = source
        .downcast_ref::<BrokenEntityReference>()
        .context("missing original broken reference")?;
    assert_eq!(cause.entity, "email verification");
    assert_eq!(cause.id, user.id);
    Ok(())
}

#[tokio::test]
async fn duplicate_usernames_report_a_unique_conflict_in_the_trace()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let tx = conn.begin().await?;
    let user = MockUser::with_label("duplicate_username")
        .insert(&tx)
        .await?;
    let trace_id = TraceId::random();

    let result = create_user(
        &tx,
        NewUser {
            name: user.name,
            email: format!("different+{}", user.email),
            email_verified: true,
            password: user.password,
        },
    )
    .in_span(Span::root(
        "test.auth.duplicate_username",
        SpanContext::new(trace_id, fastrace::collector::SpanId::random()),
    ))
    .await;
    tx.rollback().await?;

    let error = result.err().context("duplicate username should fail")?;
    assert!(error.is_unique_violation());
    flush_traces();
    let records = trace_records();
    let repo = records
        .iter()
        .find(|record| {
            record.trace_id == trace_id && record.name == "auth.create_user"
        })
        .context("missing create user repository span")?;
    assert_internal_failure::<crate::infra::database::error::DatabaseError>(
        repo,
    );
    let query = records
        .iter()
        .find(|record| {
            record.trace_id == trace_id
                && record.parent_id == repo.span_id
                && record.name.starts_with("db.query.")
        })
        .context("missing failed insert query span")?;
    assert_internal_failure::<DbErr>(query);
    Ok(())
}

#[tokio::test]
async fn duplicate_emails_report_a_unique_conflict() -> anyhow::Result<()> {
    let conn = test_connection().await?;
    let tx = conn.begin().await?;
    let user = MockUser::with_label("duplicate_email").insert(&tx).await?;
    let result = create_user(
        &tx,
        NewUser {
            name: format!("different_{}", user.name),
            email: user.email,
            email_verified: true,
            password: user.password,
        },
    )
    .await;
    tx.rollback().await?;

    let error = result.err().context("duplicate email should fail")?;
    assert!(error.is_unique_violation());
    Ok(())
}

#[tokio::test]
async fn foreign_key_failures_are_not_reported_as_unique_conflicts()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let tx = conn.begin().await?;
    let result =
        entity::user_role::Entity::insert(entity::user_role::ActiveModel {
            user_id: Set(-1),
            role_id: Set(3),
        })
        .exec(&tx)
        .await
        .db_context("insert role for missing user");
    tx.rollback().await?;

    let error = result
        .err()
        .context("missing user should violate a foreign key")?;
    assert!(!error.is_unique_violation());
    Ok(())
}

#[tokio::test]
async fn concurrent_user_lookups_keep_queries_under_their_own_request()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("concurrent_traced_user_lookup")
        .insert(&conn)
        .await?;
    let tx = conn.begin().await?;

    trace_records();
    let connection_trace_id = TraceId::random();
    let transaction_trace_id = TraceId::random();
    let connection_lookup = async {
        tokio::task::yield_now().await;
        find_by_id(&conn, user.id).await
    }
    .in_span(Span::root(
        "test.auth.connection_user_lookup",
        SpanContext::new(
            connection_trace_id,
            fastrace::collector::SpanId::random(),
        ),
    ));
    let transaction_lookup = async {
        tokio::task::yield_now().await;
        find_by_id(&tx, user.id).await
    }
    .in_span(Span::root(
        "test.auth.transaction_user_lookup",
        SpanContext::new(
            transaction_trace_id,
            fastrace::collector::SpanId::random(),
        ),
    ));

    let (connection_user, transaction_user) =
        tokio::join!(connection_lookup, transaction_lookup);
    assert_eq!(
        connection_user?
            .context("connection lookup returned no user")?
            .id,
        user.id
    );
    assert_eq!(
        transaction_user?
            .context("transaction lookup returned no user")?
            .id,
        user.id
    );

    tx.rollback().await?;
    flush_traces();

    let records = trace_records();
    assert_lookup_trace(
        &records,
        connection_trace_id,
        "test.auth.connection_user_lookup",
    )?;
    assert_lookup_trace(
        &records,
        transaction_trace_id,
        "test.auth.transaction_user_lookup",
    )?;
    Ok(())
}

fn assert_lookup_trace(
    records: &[SpanRecord],
    trace_id: TraceId,
    root_name: &str,
) -> anyhow::Result<()> {
    let trace = records
        .iter()
        .filter(|record| record.trace_id == trace_id)
        .collect::<Vec<_>>();
    let root = trace
        .iter()
        .find(|record| record.name == root_name)
        .context("missing request root span")?;
    let repo = trace
        .iter()
        .find(|record| record.name == "auth.find_by_id")
        .context("missing repository span")?;
    assert_eq!(repo.parent_id, root.span_id);

    let helper = trace
        .iter()
        .find(|record| record.name == "auth.load_user")
        .context("missing lookup helper span")?;
    assert_eq!(helper.parent_id, repo.span_id);

    let queries = trace
        .iter()
        .filter(|record| record.name.starts_with("db.query."))
        .collect::<Vec<_>>();
    assert!(
        queries
            .iter()
            .any(|record| record.parent_id == repo.span_id)
    );
    assert!(
        queries
            .iter()
            .any(|record| record.parent_id == helper.span_id)
    );
    assert!(queries.iter().all(|record| {
        record.parent_id == repo.span_id || record.parent_id == helper.span_id
    }));
    Ok(())
}

fn assert_internal_failure<E>(record: &SpanRecord) {
    for (key, value) in [
        ("outcome", "failed"),
        ("span.status_code", "error"),
        ("error.type", std::any::type_name::<E>()),
    ] {
        assert!(record.properties.iter().any(|(actual_key, actual_value)| {
            actual_key == key && actual_value == value
        }));
    }
}
