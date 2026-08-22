use anyhow::Result;
use entity::enums::{
    CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
};
use entity::{correction, correction_subscription, correction_user};
use infra_testing::{MockUser, test_connection};
use notification_core::CorrectionModerationAction;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{EntityTrait, TransactionTrait};

#[tokio::test]
async fn correction_moderation_notifies_authors_instead_of_subscribers()
-> Result<()> {
    let conn = test_connection().await;
    let actor = MockUser::with_label("moderation_recipient_actor")
        .insert(&conn)
        .await?;
    let author = MockUser::with_label("moderation_recipient_author")
        .insert(&conn)
        .await?;
    let subscriber = MockUser::with_label("moderation_recipient_subscriber")
        .insert(&conn)
        .await?;
    let correction = correction::Entity::insert(correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Pending),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(EntityType::Song),
        entity_id: Set(1),
        created_at: NotSet,
        handled_at: NotSet,
    })
    .exec_with_returning(&conn)
    .await?;

    correction_user::Entity::insert(correction_user::ActiveModel {
        correction_id: Set(correction.id),
        user_id: Set(author.id),
        user_type: Set(CorrectionUserType::Author),
    })
    .exec(&conn)
    .await?;
    correction_subscription::Entity::insert(
        correction_subscription::ActiveModel {
            user_id: Set(subscriber.id),
            correction_id: Set(correction.id),
        },
    )
    .exec(&conn)
    .await?;

    let tx = conn.begin().await?;
    let recipients = correction_notification::create_moderated(
        &tx,
        actor.id,
        correction.id,
        CorrectionModerationAction::Approved,
    )
    .await?;
    tx.rollback().await?;

    assert_eq!(
        recipients.user_ids.iter().copied().collect::<Vec<_>>(),
        [author.id]
    );

    Ok(())
}
