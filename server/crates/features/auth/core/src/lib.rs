#![expect(
    clippy::missing_errors_doc,
    clippy::must_use_candidate,
    reason = "auth core exposes shared feature contracts"
)]

pub mod password_reset;
