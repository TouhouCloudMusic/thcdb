use std::fmt::Debug;

use crate::infra;

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum Error {
    #[display("{source}")]
    Infra {
        #[error(source)]
        source: infra::Error,
    },
}

impl From<infra::Error> for Error {
    fn from(source: infra::Error) -> Self {
        Self::Infra { source }
    }
}
