use sea_orm::ActiveValue::{
    NotSet, Set, {self},
};
use sea_orm::IntoActiveValue;

use crate::sea_orm_active_enums::*;

// TODO: proc macro
macro_rules! impl_into_active_value {
    ($($type:ty),+) => {
        $(
            impl IntoActiveValue<$type> for $type {
                #[inline]
                fn into_active_value(self) -> sea_orm::ActiveValue<$type> {
                    Set(self)
                }
            }
        )+
    };
}

impl_into_active_value!(
    CorrectionType,
    CorrectionUserType,
    DatePrecision,
    ReleaseType
);

impl IntoActiveValue<DatePrecision> for Option<DatePrecision> {
    fn into_active_value(self) -> ActiveValue<DatePrecision> {
        match self {
            Some(v) => Set(v),
            None => NotSet,
        }
    }
}
