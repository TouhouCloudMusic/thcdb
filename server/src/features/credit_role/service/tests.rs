use anyhow::{Context, Result};
use entity::enums::CorrectionType;
use entity::{credit_role, credit_role_inheritance};
use infra_testing::MockUser;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde_json::json;

use super::{NewCorrection, NewCreditRole, Service, correction_service};
use crate::features::user::User;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::test_connection;

fn role_change(
    author: &User,
    name: &str,
    super_roles: &[i32],
    r#type: CorrectionType,
) -> Result<NewCorrection<NewCreditRole>> {
    Ok(NewCorrection {
        data: serde_json::from_value(json!({
            "name": name,
            "super_roles": super_roles,
        }))?,
        author: author.clone(),
        description: String::new(),
        r#type,
    })
}

#[tokio::test]
async fn approval_uses_the_latest_credit_role_revision_and_replaces_inheritance()
-> Result<()> {
    let conn = test_connection().await?;
    let author = MockUser::with_label("credit_role_author")
        .insert(&conn)
        .await?
        .into();
    let approver = MockUser::with_label("credit_role_approver")
        .insert(&conn)
        .await?
        .into();
    let service = Service {
        repo: infra_db::SeaOrmRepository::new(conn),
        user_events: UserEventSender::new(1),
    };

    let original_parent = service
        .create(role_change(
            &author,
            "Original parent",
            &[],
            CorrectionType::Create,
        )?)
        .await?
        .entity_id;
    let new_parent = service
        .create(role_change(
            &author,
            "New parent",
            &[],
            CorrectionType::Create,
        )?)
        .await?
        .entity_id;
    let role_id = service
        .create(role_change(
            &author,
            "Original role",
            &[original_parent],
            CorrectionType::Create,
        )?)
        .await?
        .entity_id;

    let correction_id = service
        .upsert_correction(
            role_id,
            role_change(
                &author,
                "First proposal",
                &[],
                CorrectionType::Update,
            )?,
            correction_service::CorrectionUpsertMode::Create,
        )
        .await?
        .submitted_id()
        .context("the role update should become a pending correction")?;
    let revised = service
        .upsert_correction(
            role_id,
            role_change(
                &author,
                "Latest proposal",
                &[new_parent],
                CorrectionType::Update,
            )?,
            correction_service::CorrectionUpsertMode::Update { correction_id },
        )
        .await?;
    assert_eq!(revised.submitted_id(), Some(correction_id));

    correction_service::approve(
        &service.repo,
        service.user_events.clone(),
        correction_id,
        approver,
    )
    .await?;

    let role = credit_role::Entity::find_by_id(role_id)
        .one(&service.repo.conn)
        .await?
        .context("the approved credit role should exist")?;
    let parents = credit_role_inheritance::Entity::find()
        .filter(credit_role_inheritance::Column::RoleId.eq(role_id))
        .all(&service.repo.conn)
        .await?
        .into_iter()
        .map(|row| row.super_id)
        .collect::<Vec<_>>();
    assert_eq!(role.name, "Latest proposal");
    assert_eq!(parents, [new_parent]);
    Ok(())
}
