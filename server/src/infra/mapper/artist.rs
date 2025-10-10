use entity::artist_membership_tenure;

use crate::domain::artist::Tenure;

impl From<&artist_membership_tenure::Model> for Tenure {
    fn from(value: &artist_membership_tenure::Model) -> Self {
        Self {
            join_year: value.join_year,
            leave_year: value.leave_year,
        }
    }
}
