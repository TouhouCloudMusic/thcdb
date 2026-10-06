use sea_orm::strum::IntoEnumIterator;
use sea_orm::{DeriveActiveEnum, EnumIter};
use serde::{Deserialize, Serialize};
use utoipa::openapi::RefOr;
use utoipa::openapi::schema::{ObjectBuilder, Schema, Type};
use utoipa::{PartialSchema, ToSchema};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RatingTarget {
    pub kind: RatingTargetKind,
    pub id: i32,
}

#[derive(
    Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize, ToSchema,
)]
#[serde(rename_all = "lowercase")]
pub enum RatingTargetKind {
    Release,
    Song,
}

#[derive(
    Clone,
    Copy,
    Debug,
    DeriveActiveEnum,
    Deserialize,
    EnumIter,
    Eq,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
#[repr(u8)]
#[sea_orm(rs_type = "i16", db_type = "SmallInteger")]
#[serde(try_from = "f64", into = "f64")]
pub enum Rating {
    Half = 1,
    One = 2,
    OneAndHalf = 3,
    Two = 4,
    TwoAndHalf = 5,
    Three = 6,
    ThreeAndHalf = 7,
    Four = 8,
    FourAndHalf = 9,
    Five = 10,
}

impl From<Rating> for f64 {
    fn from(rating: Rating) -> Self {
        Self::from(rating as u8) / 2.0
    }
}

impl TryFrom<f64> for Rating {
    type Error = &'static str;

    fn try_from(stars: f64) -> Result<Self, Self::Error> {
        match stars {
            0.5 => Ok(Self::Half),
            1.0 => Ok(Self::One),
            1.5 => Ok(Self::OneAndHalf),
            2.0 => Ok(Self::Two),
            2.5 => Ok(Self::TwoAndHalf),
            3.0 => Ok(Self::Three),
            3.5 => Ok(Self::ThreeAndHalf),
            4.0 => Ok(Self::Four),
            4.5 => Ok(Self::FourAndHalf),
            5.0 => Ok(Self::Five),
            _ => {
                Err("rating must be between 0.5 and 5 in half-star increments")
            }
        }
    }
}

impl PartialSchema for Rating {
    fn schema() -> RefOr<Schema> {
        ObjectBuilder::new()
            .schema_type(Type::Number)
            .enum_values(Some(Self::iter().map(f64::from)))
            .into()
    }
}

impl ToSchema for Rating {}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct RatingSummary {
    pub average: Option<f64>,
    pub count: u64,
    pub user_rating: Option<Rating>,
}
