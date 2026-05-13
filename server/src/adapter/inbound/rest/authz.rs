use sea_orm::ConnectionTrait;

use crate::domain::model::PermissionMarker;
use crate::infra::authz;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::PermissionDenied;
use crate::shared::http::api_response::AppError;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("Permission denied")]
    PermissionDenied,
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database(err) => err.into(),
            Error::PermissionDenied => PermissionDenied.into(),
        }
    }
}

impl axum::response::IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

pub async fn ensure_permission<P: PermissionMarker>(
    db: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), Error> {
    let has_permission = authz::user_has_permission::<P>(db, user_id)
        .await
        .db_operation("check user permission")?;

    if !has_permission {
        return Err(Error::PermissionDenied);
    }

    Ok(())
}
