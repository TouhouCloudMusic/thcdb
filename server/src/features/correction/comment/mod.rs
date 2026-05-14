mod http;
pub(super) use http::router;
use sea_orm::ConnectionTrait;

use crate::domain::shared::{CursorResponse, DEFAULT_LIMIT};
pub(super) use crate::features::comment::CorrectionComment;
pub(in crate::features::correction) use crate::features::comment::Error;
use crate::features::comment::{self, CommentTarget};

pub(super) async fn initial_page(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<CursorResponse<CorrectionComment>, Error> {
    let comments = comment::initial_page(
        conn,
        CommentTarget::Correction,
        correction_id,
        DEFAULT_LIMIT,
    )
    .await?;
    Ok(comments
        .map(|comment| CorrectionComment::from_entity(correction_id, comment)))
}
