use std::fmt::Debug;

use derive_more::From;
use error_set::error_set;
use macros::{ApiError, IntoErrorSchema};

error_set! {
    #[derive(From, ApiError, IntoErrorSchema)]
    #[disable(From(crate::infra::Error))]
    ApiError = {
        #[from(forward)]
        Infra(crate::infra::Error)
    };
}
