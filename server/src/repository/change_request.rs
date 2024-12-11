use std::future::Future;

use bon::builder;
use entity::sea_orm_active_enums::{
    ChangeRequestStatus, ChangeRequestType, ChangeRequestUserType, EntityType,
};
use entity::{change_request, change_request_revision, change_request_user};
use sea_orm::prelude::DateTimeWithTimeZone;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ConnectionTrait, DbErr};

type ChangeRequestResult = Result<change_request::Model, DbErr>;

#[builder]
pub async fn create<C: ConnectionTrait>(
    author_id: i32,
    description: String,
    entity_type: EntityType,
    entity_created_at: DateTimeWithTimeZone,
    db: &C,
) -> ChangeRequestResult {
    let result = change_request::ActiveModel {
        id: NotSet,
        request_status: Set(ChangeRequestStatus::Approved),
        request_type: Set(ChangeRequestType::Create),
        entity_type: Set(entity_type),
        description: Set(description),
        created_at: Set(entity_created_at),
        handled_at: Set(entity_created_at),
    }
    .insert(db)
    .await?;

    change_request_user::ActiveModel {
        id: NotSet,
        change_request_id: Set(result.id),
        user_id: Set(author_id),
        user_type: Set(ChangeRequestUserType::Author),
    }
    .insert(db)
    .await?;

    Ok(result)
}

impl<'f, C, S> CreateBuilder<'f, C, S>
where
    C: ConnectionTrait,
    S: create_builder::State,
    S::EntityType: create_builder::IsUnset,
{
    #[inline]
    pub fn artist(
        self,
    ) -> CreateBuilder<'f, C, create_builder::SetEntityType<S>> {
        self.entity_type(EntityType::Artist)
    }

    #[inline]
    pub fn release(
        self,
    ) -> CreateBuilder<'f, C, create_builder::SetEntityType<S>> {
        self.entity_type(EntityType::Release)
    }

    #[inline]
    pub fn song(
        self,
    ) -> CreateBuilder<'f, C, create_builder::SetEntityType<S>> {
        self.entity_type(EntityType::Song)
    }
}

pub fn link_history<C: ConnectionTrait>(
    change_request_id: i32,
    entity_history_id: i32,
    db: &C,
) -> impl Future<Output = Result<change_request_revision::Model, DbErr>> + '_ {
    change_request_revision::ActiveModel {
        change_request_id: Set(change_request_id),
        entity_history_id: Set(entity_history_id),
    }
    .insert(db)
}
