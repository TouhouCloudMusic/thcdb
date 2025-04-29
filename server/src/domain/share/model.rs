use chrono::NaiveDate;
use entity::credit_role::Model as DbCreditRole;
use entity::language::Model as DbLanguage;
use macros::AutoMapper;
use serde::Serialize;
use utoipa::ToSchema;

mod pub_use_below {}
pub use entity::sea_orm_active_enums::DatePrecision;

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[mapper(from(DbCreditRole))]
pub struct CreditRole {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
pub struct DateWithPrecision {
    pub value: NaiveDate,
    pub precision: DatePrecision,
}

impl From<(NaiveDate, DatePrecision)> for DateWithPrecision {
    fn from((value, precision): (NaiveDate, DatePrecision)) -> Self {
        Self { value, precision }
    }
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct LocalizedName {
    pub language: Language,
    pub name: String,
}

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[mapper(from(DbLanguage))]
pub struct Language {
    pub id: i32,
    pub code: String,
    pub name: String,
}
