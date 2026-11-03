use anyhow::Context;
use entity::{user, user_role};
use fastrace::collector::TraceId;
use fastrace::future::FutureExt;
use fastrace::prelude::{Span, SpanContext};
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use super::reject;
use crate::features::correction::ModerationError;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::{
    flush_traces, test_connection, trace_records,
};

#[tokio::test]
async fn missing_corrections_are_rejected_after_a_successful_lookup()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let approver = MockUser::with_label("missing_correction_approver")
        .insert(&conn)
        .await?;
    let approver_id = approver.id;
    let repo = SeaOrmRepository::new(conn.clone());
    let trace_id = TraceId::random();

    let error = reject(&repo, UserEventSender::new(1), -1, approver.into())
        .in_span(Span::root(
            "test.correction.missing_correction",
            SpanContext::new(trace_id, fastrace::collector::SpanId::random()),
        ))
        .await
        .err()
        .context("the correction should not exist")?;

    assert!(matches!(error, ModerationError::NotFound));

    flush_traces();
    let records = trace_records();
    let service = records
        .iter()
        .find(|record| {
            record.trace_id == trace_id
                && record.name == "correction.service.reject"
        })
        .context("missing correction service span")?;
    let lookup = records
        .iter()
        .find(|record| {
            record.trace_id == trace_id && record.name == "correction.lock"
        })
        .context("missing correction lookup repository span")?;
    assert_eq!(lookup.parent_id, service.span_id);
    assert!(
        lookup
            .properties
            .iter()
            .any(|(key, value)| { key == "outcome" && value == "succeeded" })
    );
    assert!(
        !lookup.properties.iter().any(|(key, _)| {
            key == "span.status_code" || key == "error.type"
        })
    );
    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(approver_id))
        .exec(&conn)
        .await?;
    user::Entity::delete_by_id(approver_id).exec(&conn).await?;
    Ok(())
}
