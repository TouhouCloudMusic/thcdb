#![expect(
    clippy::missing_errors_doc,
    clippy::must_use_candidate,
    reason = "feature worker crates expose Apalis handler entrypoints"
)]

pub mod password_reset_email;
pub mod sign_up_cleanup;
