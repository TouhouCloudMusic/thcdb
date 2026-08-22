mod compare;
mod detail;
mod diff;
mod error;
mod history;
mod http;
mod model;
mod moderation;
mod pending;
mod repo;
mod revisions;
pub mod service;
mod shared;
pub(crate) mod subscription;

pub(crate) use error::{ModerationError, ReadError, SubmissionError};
pub use http::router;
pub use model::{
    Correction, CorrectionDecision, CorrectionDiff, CorrectionDiffEntry,
    CorrectionEntity, CorrectionFilter, CorrectionFilterStatus,
    CorrectionSubmitResult, NewCorrection, NewCorrectionDto, NewCorrectionMeta,
};
