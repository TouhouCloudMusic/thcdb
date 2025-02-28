pub mod group_member {
    use entity::sea_orm_active_enums::{JoinYearType, LeaveYearType};
    use entity::{group_member_join_leave, group_member_join_leave_history};
    use serde::{Deserialize, Serialize};
    use utoipa::ToSchema;

    #[derive(Clone, Copy, Serialize, Deserialize, ToSchema)]
    pub enum JoinYear {
        FoundingMember,
        Specific(Option<i16>),
    }

    impl JoinYear {
        pub const fn deconstruct(self) -> (Option<i16>, JoinYearType) {
            match self {
                Self::FoundingMember => (None, JoinYearType::FoundingMember),
                Self::Specific(year) => (year, JoinYearType::Specific),
            }
        }
    }

    impl From<&group_member_join_leave::Model> for JoinYear {
        fn from(value: &group_member_join_leave::Model) -> Self {
            match value.join_year_type {
                JoinYearType::FoundingMember => Self::FoundingMember,
                JoinYearType::Specific => Self::Specific(value.join_year),
            }
        }
    }
    impl From<&group_member_join_leave_history::Model> for JoinYear {
        fn from(value: &group_member_join_leave_history::Model) -> Self {
            match value.join_year_type {
                JoinYearType::FoundingMember => Self::FoundingMember,
                JoinYearType::Specific => Self::Specific(value.join_year),
            }
        }
    }

    #[derive(Clone, Copy, Serialize, Deserialize, ToSchema)]
    pub enum LeaveYear {
        Unknown,
        Specific(Option<i16>),
    }

    impl LeaveYear {
        pub const fn deconstruct(self) -> (Option<i16>, LeaveYearType) {
            match self {
                Self::Unknown => (None, LeaveYearType::Unknown),
                Self::Specific(year) => (year, LeaveYearType::Specific),
            }
        }
    }

    impl From<&group_member_join_leave::Model> for LeaveYear {
        fn from(value: &group_member_join_leave::Model) -> Self {
            match value.leave_year_type {
                LeaveYearType::Unknown => Self::Unknown,
                LeaveYearType::Specific => Self::Specific(value.leave_year),
            }
        }
    }

    impl From<&group_member_join_leave_history::Model> for LeaveYear {
        fn from(value: &group_member_join_leave_history::Model) -> Self {
            match value.leave_year_type {
                LeaveYearType::Unknown => Self::Unknown,
                LeaveYearType::Specific => Self::Specific(value.leave_year),
            }
        }
    }
}
