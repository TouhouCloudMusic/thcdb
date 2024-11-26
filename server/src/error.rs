use error_set::error_set;
use std::fmt::Debug;

error_set! {
    ServiceError = {
        #[display("Invalid field: {field}, expected: {expected}, accepted: {accepted}.")]
        InvalidField {
            field: String,
            expected: String,
            accepted: String
        },
        #[display("Database error")]
        Database(sea_orm::DbErr),
    };
    SongServiceError = {
        #[display("Placeholder Error")]
        Placeholder,
    } || ServiceError;
}

pub trait LogErr {
    fn log_err(self) -> Self;
}

impl<T, E> LogErr for Result<T, E>
where
    E: Debug,
{
    #[inline]
    fn log_err(self) -> Self {
        if let Err(ref e) = self {
            tracing::error!("{:#?}", e);
        }
        self
    }
}
