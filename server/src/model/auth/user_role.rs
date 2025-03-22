use serde::Serialize;
use strum_macros::{EnumCount, EnumIter, EnumString};

#[derive(
    Clone,
    Copy,
    EnumString,
    EnumIter,
    EnumCount,
    strum_macros::Display,
    Serialize,
)]
pub enum UserRole {
    Admin,
    Moderator,
    User,
}
