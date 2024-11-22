use error_set::error_set;
use serde::{Deserialize, Serialize};

error_set! {
    ServiceError = {
        #[display("Invalid field: {field}, expected type: {expected}, accepted: {accepted}")]
        InvalidField {
            field: String,
            expected: String,
            accepted: String
        },
        #[display("Database error")]
        DatabaseError(sea_orm::DbErr) 
    };
    SongServiceError = {
        #[display("Placeholder Error")]
        Placeholder,
    } || ServiceError;
}