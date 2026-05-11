use std::fmt::Debug;

use crate::infra;

#[derive(Debug, snafu::Snafu)]
pub enum Error {
    #[snafu(transparent)]
    Infra { source: infra::Error },
}
