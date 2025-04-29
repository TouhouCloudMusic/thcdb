use entity::group_member_join_leave;

use crate::domain::artist::model::Tenure;

impl From<&group_member_join_leave::Model> for Tenure {
    fn from(value: &group_member_join_leave::Model) -> Self {
        Self {
            join_year: value.join_year,
            leave_year: value.leave_year,
        }
    }
}
