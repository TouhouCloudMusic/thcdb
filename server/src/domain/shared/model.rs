use chrono::NaiveDate;
use derive_more::{Display, Into};
use entity::language::Model as DbLanguage;
use entity::user as user_entity;
use macros::AutoMapper;
use sea_orm::DerivePartialModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

mod pub_use_below {}
pub use entity::sea_orm_active_enums::DatePrecision;
use libfp::Len;

use crate::constant::{ENTITY_IDENT_MAX_LEN, ENTITY_IDENT_MIN_LEN};
use crate::shared::error::MessageValidationError;
use crate::utils::validation::{InvalidLen, LenCheck};

#[derive(Clone, Copy, Debug, Serialize, Deserialize, ToSchema)]
pub struct DateWithPrecision {
    pub value: NaiveDate,
    pub precision: DatePrecision,
}

impl DateWithPrecision {
    pub const fn destruct(self) -> (NaiveDate, DatePrecision) {
        (self.value, self.precision)
    }

    pub const fn from_option(
        value: Option<NaiveDate>,
        precision: DatePrecision,
    ) -> Option<Self> {
        match value {
            Some(value) => Some(Self { value, precision }),
            None => None,
        }
    }
}

impl From<(NaiveDate, DatePrecision)> for DateWithPrecision {
    fn from((value, precision): (NaiveDate, DatePrecision)) -> Self {
        Self { value, precision }
    }
}

#[derive(Debug, Clone, Display, Into, Deserialize, ToSchema)]
pub struct EntityIdent(String);

impl EntityIdent {
    pub fn try_new(val: impl Into<String>) -> Result<Self, InvalidLen<Self>> {
        fn inner(val: String) -> Result<EntityIdent, InvalidLen<EntityIdent>> {
            EntityIdent(val).len_check()
        }

        inner(val.into())
    }
}

impl Len for EntityIdent {
    type Unit = usize;

    fn len(&self) -> Self::Unit {
        self.0.len()
    }
}

impl LenCheck for EntityIdent {
    const MIN: Self::Unit = ENTITY_IDENT_MIN_LEN;
    const MAX: Self::Unit = ENTITY_IDENT_MAX_LEN;
}

#[derive(Clone, Copy, Debug)]
pub struct SearchTermConfig {
    pub min_len: usize,
    pub max_len: usize,
}

impl SearchTermConfig {
    pub const DEFAULT: Self = Self {
        min_len: 1,
        max_len: 256,
    };
    pub const fn new(min_len: usize, max_len: usize) -> Self {
        Self { min_len, max_len }
    }

    fn validate(&self, value: &str) -> Result<String, MessageValidationError> {
        let trimmed = value.trim();
        let len = trimmed.chars().take(self.max_len + 1).count();
        if len < self.min_len {
            return Err(MessageValidationError::new(format!(
                "keyword must be at least {} characters",
                self.min_len
            )));
        }
        if len > self.max_len {
            return Err(MessageValidationError::new("keyword is too long"));
        }
        Ok(trimmed.to_owned())
    }
}

impl Default for SearchTermConfig {
    fn default() -> Self {
        Self::DEFAULT
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SearchTerm(String);

impl SearchTerm {
    pub fn try_new(
        value: impl Into<String>,
        config: SearchTermConfig,
    ) -> Result<Self, MessageValidationError> {
        let validated = config.validate(&value.into())?;
        Ok(Self(validated))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for SearchTerm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl AsRef<str> for SearchTerm {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

#[derive(Clone, Debug, Eq, PartialEq, ToSchema)]
#[schema(value_type = String, pattern = "^.+$")]
pub struct NonEmptyString(String);

impl NonEmptyString {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::ops::Deref for NonEmptyString {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        self.as_str()
    }
}

impl AsRef<str> for NonEmptyString {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl From<NonEmptyString> for String {
    fn from(s: NonEmptyString) -> Self {
        s.0
    }
}

impl<'de> Deserialize<'de> for NonEmptyString {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;

        if value.is_empty() {
            return Err(serde::de::Error::custom("must not be empty"));
        }

        Ok(Self(value))
    }
}

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[mapper(from(DbLanguage))]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct Language {
    pub id: i32,
    pub code: String,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct LocalizedName {
    pub language: Language,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema, DerivePartialModel)]
#[sea_orm(entity = "user_entity::Entity", from_query_result)]
pub struct ImageUploaderSummary {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct NewLocalizedName {
    pub language_id: i32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct LocalizedTitle {
    pub language: Language,
    pub title: String,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct NewLocalizedTitle {
    pub language_id: i32,
    pub title: String,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct Location {
    pub country: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
}

impl Location {
    pub const fn is_empty(&self) -> bool {
        matches!(
            self,
            Self {
                country: None,
                province: None,
                city: None,
            }
        )
    }
}
