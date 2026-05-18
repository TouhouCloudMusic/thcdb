#![feature(try_blocks)]
#![expect(
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::must_use_candidate,
    reason = "storage infrastructure exposes small framework helpers"
)]

mod fs;

pub use fs::{DeferredDelete, FsStorage};
