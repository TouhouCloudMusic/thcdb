#![expect(
    clippy::missing_errors_doc,
    reason = "storage worker crate exposes Apalis handler entrypoints"
)]

mod remove_file;

pub use remove_file::{
    RemoveFileDeferredDelete, RemoveFileJob, RemoveFileQueue, WorkerState,
    handle, queue,
};
