use sea_orm::{ActiveValue, IntoActiveValue};

use crate::sea_orm_active_enums::{ChangeRequestType, ChangeRequestUserType};

impl IntoActiveValue<ChangeRequestType> for ChangeRequestType {
    #[inline]
    fn into_active_value(self) -> sea_orm::ActiveValue<ChangeRequestType> {
        ActiveValue::Set(self)
    }
}

impl IntoActiveValue<ChangeRequestUserType> for ChangeRequestUserType {
    #[inline]
    fn into_active_value(self) -> sea_orm::ActiveValue<ChangeRequestUserType> {
        ActiveValue::Set(self)
    }
}
