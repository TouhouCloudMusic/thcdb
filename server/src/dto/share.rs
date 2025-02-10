use entity::{release_localized_title, release_localized_title_history};
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, ToSchema, Serialize)]
pub struct CreditRole {
    pub id: i32,
    pub name: String,
}

impl_from!(entity::credit_role::Model > CreditRole { id, name });

#[derive(Clone, ToSchema, Serialize, Deserialize, FromQueryResult)]
pub struct Language {
    pub id: i32,
    pub code: String,
    pub name: String,
}

impl_from!(entity::language::Model > Language { id, code, name });

#[derive(ToSchema, Serialize)]
pub struct LocalizedTitle {
    pub language: Language,
    pub title: String,
}

impl_from!(NewLocalizedTitle > release_localized_title::Model {
    title,
    language_id,
    : release_id Default::default(),
});

impl_from!(
    NewLocalizedTitle >
    release_localized_title_history::Model {
        title,
        language_id,
        : history_id Default::default(),
    }
);

impl_from!(
    NewLocalizedTitle >
    release_localized_title::ActiveModel {
        title,
        language_id,
        : release_id NotSet
    },
    Set
);

impl_from!(
    NewLocalizedTitle >
    release_localized_title_history::ActiveModel {
        title,
        language_id,
        : history_id NotSet
    },
    Set
);

#[derive(ToSchema, Serialize)]
pub struct SimpleLocalizedTitle {
    pub language_id: i32,
    pub title: String,
}

#[derive(ToSchema, Serialize)]
pub struct SimpleLocalizedName {
    pub language_id: i32,
    pub name: String,
}

impl_from!(
    entity::song_localized_title::Model
        > SimpleLocalizedTitle { language_id, title }
);

impl_from!(
    entity::label_localized_name::Model
        > SimpleLocalizedName { language_id, name }
);

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewLocalizedTitle {
    pub title: String,
    pub language_id: i32,
}
