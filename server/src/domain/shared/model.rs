use chrono::NaiveDate;
use derive_more::{Display, Into};
use entity::credit_role::Model as DbCreditRole;
use entity::language::Model as DbLanguage;
use macros::AutoMapper;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

mod pub_use_below {}
pub use entity::sea_orm_active_enums::DatePrecision;
use libfp::Len;

use crate::constant::{ENTITY_IDENT_MAX_LEN, ENTITY_IDENT_MIN_LEN};
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
