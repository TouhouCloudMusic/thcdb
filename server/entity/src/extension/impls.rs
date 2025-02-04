use crate::group_member_join_leave;

impl From<group_member_join_leave::Model> for (Option<String>, Option<String>) {
    fn from(val: group_member_join_leave::Model) -> Self {
        (val.join_year, val.leave_year)
    }
}

impl From<&group_member_join_leave::Model>
    for (Option<String>, Option<String>)
{
    fn from(val: &group_member_join_leave::Model) -> Self {
        (val.join_year.clone(), val.leave_year.clone())
    }
}
