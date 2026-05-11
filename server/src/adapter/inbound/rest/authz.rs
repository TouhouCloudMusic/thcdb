use sea_orm::ConnectionTrait;

use crate::domain::model::PermissionMarker;
use crate::infra::authz;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::PermissionDenied;
use crate::shared::http::api_response::AppError;

#[derive(Debug, derive_more::From)]
pub enum Error {
    #[from]
    Database(DatabaseError),
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

impl From<Error> for axum::response::Response {
    fn from(err: Error) -> Self {
        AppError::from(err).into()
    }
}

pub async fn ensure_permission<P: PermissionMarker>(
    db: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), Error> {
    let has_permission = authz::user_has_permission::<P>(db, user_id)
        .await
        .with_operation("check user permission")?;

    if !has_permission {
        return Err(Error::PermissionDenied);
    }

    Ok(())
}
