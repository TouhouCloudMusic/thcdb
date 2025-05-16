use entity::sea_orm_active_enums::AlternativeNameType;
use entity::{release_localized_title, release_localized_title_history};
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub struct WithEntityId<T> {
    entity_id: i32,
    value: T,
}

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

#[derive(Clone, ToSchema, Serialize, Deserialize)]
pub enum AlternativeName {
    Alias { name: String },
    Localization { name: String, language_id: i32 },
}

#[derive(Clone, ToSchema, Serialize)]
pub struct AlternativeNameResponse {
    pub name: String,
    pub r#type: AlternativeNameType,
    pub language_id: Option<i32>,
}

impl AlternativeName {
    pub const fn with_entity_id(self, id: i32) -> WithEntityId<Self> {
        WithEntityId {
            entity_id: id,
            value: self,
        }
    }
}

mod impl_alt_name {
    use entity::sea_orm_active_enums::AlternativeNameType;
    use entity::{event_alternative_name, event_alternative_name_history};
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::IntoActiveValue;

    use super::{AlternativeName, WithEntityId};

    impl From<WithEntityId<AlternativeName>>
        for event_alternative_name::ActiveModel
    {
        fn from(
            WithEntityId { entity_id, value }: WithEntityId<AlternativeName>,
        ) -> Self {
            match value {
                AlternativeName::Alias { name } => Self {
                    id: NotSet,
                    event_id: entity_id.into_active_value(),
                    name: name.into_active_value(),
                    r#type: Set(AlternativeNameType::Alias),
                    language_id: Set(None),
                },
                AlternativeName::Localization { name, language_id } => Self {
                    id: NotSet,
                    event_id: entity_id.into_active_value(),
                    name: name.into_active_value(),
                    r#type: Set(AlternativeNameType::Localization),
                    language_id: Set(Some(language_id)),
                },
            }
        }
    }
    impl From<WithEntityId<AlternativeName>>
        for event_alternative_name_history::ActiveModel
    {
        fn from(
            WithEntityId { entity_id, value }: WithEntityId<AlternativeName>,
        ) -> Self {
            match value {
                AlternativeName::Alias { name } => Self {
                    id: NotSet,
                    history_id: entity_id.into_active_value(),
                    name: name.into_active_value(),
                    r#type: Set(AlternativeNameType::Alias),
                    language_id: Set(None),
                },
                AlternativeName::Localization { name, language_id } => Self {
                    id: NotSet,
                    history_id: entity_id.into_active_value(),
                    name: name.into_active_value(),
                    r#type: Set(AlternativeNameType::Localization),
                    language_id: Set(Some(language_id)),
                },
            }
        }
    }

    impl From<event_alternative_name_history::Model> for AlternativeName {
        fn from(model: event_alternative_name_history::Model) -> Self {
            match model.language_id {
                Some(id) => Self::Localization {
                    name: model.name,
                    language_id: id,
                },
                None => Self::Alias { name: model.name },
            }
        }
    }
}

mod impl_alt_name_res {
    use entity::event_alternative_name;

    use super::AlternativeNameResponse;

    impl From<event_alternative_name::Model> for AlternativeNameResponse {
        fn from(model: event_alternative_name::Model) -> Self {
            Self {
                name: model.name,
                r#type: model.r#type,
                language_id: model.language_id,
            }
        }
    }
}
