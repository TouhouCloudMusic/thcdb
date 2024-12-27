use sea_orm::ActiveValue::{self, NotSet, Set};
use sea_orm::IntoActiveValue;

use crate::sea_orm_active_enums::{
    CorrectionType, CorrectionUserType, DatePrecision,
};

impl IntoActiveValue<CorrectionType> for CorrectionType {
    #[inline]
    fn into_active_value(self) -> sea_orm::ActiveValue<CorrectionType> {
        Set(self)
    }
}

impl IntoActiveValue<CorrectionUserType> for CorrectionUserType {
    #[inline]
    fn into_active_value(self) -> sea_orm::ActiveValue<CorrectionUserType> {
        Set(self)
    }
}

impl IntoActiveValue<DatePrecision> for Option<DatePrecision> {
    fn into_active_value(self) -> ActiveValue<DatePrecision> {
        match self {
            Some(v) => Set(v),
            None => NotSet,
        }
    }
}
