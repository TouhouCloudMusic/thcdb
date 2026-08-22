#![expect(
    clippy::missing_errors_doc,
    reason = "auth core exposes shared feature contracts"
)]

pub mod password_reset;
pub mod permission;
pub mod user_role;
pub mod verification_code;
