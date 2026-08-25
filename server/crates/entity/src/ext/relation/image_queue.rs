use sea_orm::{EntityTrait, EnumIter, RelationTrait};

use crate::entities::{image_queue, user};

#[derive(Debug, EnumIter)]
pub enum ImageQueueRelationExt {
    Creator,
}

impl RelationTrait for ImageQueueRelationExt {
    fn def(&self) -> sea_orm::RelationDef {
        match self {
            Self::Creator => image_queue::Entity::belongs_to(user::Entity)
                .from(image_queue::Column::CreatedBy)
                .to(user::Column::Id)
                .into(),
        }
    }
}
