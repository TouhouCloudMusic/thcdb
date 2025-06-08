use sea_orm::{EntityTrait, EnumIter, RelationTrait};

use crate::entities::*;

#[derive(Debug, EnumIter)]
pub enum UserRelationExt {
    Avatar,
    ProfileBanner,
}

impl RelationTrait for UserRelationExt {
    fn def(&self) -> sea_orm::RelationDef {
        match self {
            UserRelationExt::Avatar => user::Entity::belongs_to(image::Entity)
                .from(user::Column::AvatarId)
                .to(image::Column::Id)
                .into(),
            UserRelationExt::ProfileBanner => {
                user::Entity::belongs_to(image::Entity)
                    .from(user::Column::ProfileBannerId)
                    .to(image::Column::Id)
                    .into()
            }
        }
    }
}
