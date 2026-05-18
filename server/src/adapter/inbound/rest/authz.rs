use sea_orm::ConnectionTrait;

use crate::features::auth::PermissionName;
use crate::infra::authz;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::PermissionDenied;

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

impl axum::response::IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Database(err) => err.into_response(),
            Self::PermissionDenied => PermissionDenied.into_response(),
        }
    }
}

pub async fn ensure_permission(
    db: &impl ConnectionTrait,
    user_id: i32,
    permission_name: PermissionName,
) -> Result<(), Error> {
    let has_permission =
        authz::user_has_permission(db, user_id, permission_name)
            .await
            .db_operation("check user permission")?;

    if !has_permission {
        return Err(Error::PermissionDenied);
    }

    Ok(())
}
