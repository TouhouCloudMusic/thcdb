#![expect(
    clippy::missing_errors_doc,
    clippy::result_unit_err,
    reason = "crate split keeps the existing domain API shape"
)]

pub mod constant;
pub mod email;
pub mod image;
pub mod markdown;
pub mod shared;
pub mod validation;
