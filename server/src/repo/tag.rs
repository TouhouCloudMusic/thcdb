use sea_orm::{ActiveModelTrait, DatabaseTransaction};
use entity::{tag, tag_history};
use entity::sea_orm_active_enums::EntityType;
use crate::dto::correction::Metadata;
use crate::dto::tag::NewTag;
use crate::error::GeneralRepositoryError;
use crate::repo;

pub async fn create(
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<tag::Model, GeneralRepositoryError> {
    let new_tag = tag::ActiveModel::from(&data).insert(tx).await?;
    let history = tag_history::ActiveModel::from(&data).insert(tx).await?;

    let correction = repo::correction::create_self_approval()
        .author_id(correction_metadata.author_id)
        .entity_type(EntityType::Tag)
        .entity_id(new_tag.id)
        .db(tx)
        .call()
        .await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(correction_metadata.description.clone())
        .db(tx)
        .call()
        .await?;

    Ok(new_tag)
}
