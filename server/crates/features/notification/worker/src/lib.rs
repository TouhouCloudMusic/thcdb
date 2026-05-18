#![expect(
    clippy::must_use_candidate,
    reason = "feature worker crates expose Apalis handler entrypoints"
)]

pub mod cleanup;
