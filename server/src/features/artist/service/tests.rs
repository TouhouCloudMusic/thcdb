use anyhow::{Context, Result};
use entity::enums::CorrectionType;
use entity::{
    artist_membership, artist_membership_role, artist_membership_tenure,
    credit_role,
};
use infra_testing::MockUser;
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, EntityTrait, ModelTrait, QueryFilter, QueryOrder};
use serde_json::json;

use super::{NewArtist, NewCorrection, Service, correction_service};
use crate::features::user::User;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::fixture::MockArtist;
use crate::infra::integration_test::test_connection;

#[tokio::test]
async fn approving_a_group_edit_replaces_memberships_with_their_roles_and_tenures()
-> Result<()> {
    let conn = test_connection().await?;
    let author: User = MockUser::with_label("artist_revision_author")
        .insert(&conn)
        .await?
        .into();
    let approver: User = MockUser::with_label("artist_revision_approver")
        .insert(&conn)
        .await?
        .into();
    let service = Service::new(
        infra_db::SeaOrmRepository::new(conn.clone()),
        UserEventSender::new(1),
    );
    let departed = MockArtist::named("Departed member").insert(&conn).await?;
    let vocalist = MockArtist::named("New vocalist").insert(&conn).await?;
    let member = MockArtist::named("New member").insert(&conn).await?;
    let role_id = credit_role::Entity::insert(credit_role::ActiveModel {
        name: Set("Vocalist in group edit".to_owned()),
        short_description: Set(String::new()),
        description: Set(String::new()),
        ..Default::default()
    })
    .exec(&conn)
    .await?
    .last_insert_id;
    let change = |r#type, memberships| -> Result<NewCorrection<NewArtist>> {
        Ok(NewCorrection {
            author: author.clone(),
            r#type,
            description: String::new(),
            data: serde_json::from_value(json!({
                "name": "Group with a revised lineup",
                "artist_type": "Multiple",
                "memberships": memberships,
            }))?,
        })
    };

    let group_id = service
        .create(change(
            CorrectionType::Create,
            json!([
                {"artist_id": departed.id, "roles": [role_id], "tenure": [{"join_year": 2012}]},
            ]),
        )?)
        .await?
        .entity_id;

    let departed_membership = artist_membership::Entity::find()
        .filter(artist_membership::Column::GroupId.eq(group_id))
        .filter(artist_membership::Column::MemberId.eq(departed.id))
        .one(&conn)
        .await?
        .context("departed member has a live membership before approval")?;
    departed_membership
        .find_related(artist_membership_role::Entity)
        .one(&conn)
        .await?
        .context("departed member has a live role before approval")?;
    departed_membership
        .find_related(artist_membership_tenure::Entity)
        .one(&conn)
        .await?
        .context("departed member has a live tenure before approval")?;

    let correction_id = service
        .upsert_correction(
            group_id,
            change(CorrectionType::Update, json!([
                {"artist_id": member.id, "roles": [], "tenure": [{"join_year": 2024}]},
                {"artist_id": vocalist.id, "roles": [role_id], "tenure": [{"join_year": 2020}]},
            ]))?,
            correction_service::CorrectionUpsertMode::Create,
        )
        .await?
        .submitted_id()
        .context("group edit is pending approval")?;

    correction_service::approve(
        &service.repo,
        service.user_events.clone(),
        correction_id,
        approver,
    )
    .await?;

    let memberships = artist_membership::Entity::find()
        .filter(artist_membership::Column::GroupId.eq(group_id))
        .order_by_asc(artist_membership::Column::MemberId)
        .all(&conn)
        .await?;
    let mut actual = Vec::new();
    for membership in memberships {
        let roles = membership
            .find_related(artist_membership_role::Entity)
            .all(&conn)
            .await?;
        let tenures = membership
            .find_related(artist_membership_tenure::Entity)
            .all(&conn)
            .await?;
        actual.push((
            membership.member_id,
            roles
                .into_iter()
                .map(|role| role.role_id)
                .collect::<Vec<_>>(),
            tenures
                .into_iter()
                .map(|tenure| (tenure.join_year, tenure.leave_year))
                .collect::<Vec<_>>(),
        ));
    }
    assert_eq!(
        actual,
        [
            (vocalist.id, vec![role_id], vec![(Some(2020), None)]),
            (member.id, vec![], vec![(Some(2024), None)]),
        ]
    );
    Ok(())
}
