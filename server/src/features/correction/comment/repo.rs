use entity::enums::{
    CommentState as DbCommentState, CommentTarget as DbCommentTarget,
};
use entity::{comment as comment_entity, correction as correction_entity};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    IntoActiveModel, QueryFilter, QueryOrder, QuerySelect,
};

use super::error::{Error, NotFound};
use super::model::{CorrectionComment, CreateCorrectionCommentRequest};
use crate::domain::shared::CursorResponse;
use crate::infra::database::error::DatabaseResultExt;

pub(super) async fn ensure_correction_exists(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<(), Error> {
    let exists = correction_entity::Entity::find_by_id(correction_id)
        .one(conn)
        .await
        .with_operation("check correction exists for comment")?
        .is_some();

    if exists {
        Ok(())
    } else {
        Err(Error::NotFound(NotFound::Correction))
    }
}

pub(super) async fn load_comments_page(
    conn: &impl ConnectionTrait,
    correction_id: i32,
    cursor: Option<i32>,
    limit: u8,
) -> Result<CursorResponse<CorrectionComment>, Error> {
    let offset = cursor.unwrap_or(0).max(0);
    let limit_i32 = i32::from(limit);
    let limit = u64::from(limit);

    let rows = comment_entity::Entity::find()
        .filter(comment_entity::Column::Target.eq(DbCommentTarget::Correction))
        .filter(comment_entity::Column::TargetId.eq(correction_id))
        .order_by_asc(comment_entity::Column::CreatedAt)
        .order_by_asc(comment_entity::Column::Id)
        .offset(u64::try_from(offset).unwrap_or(0))
        .limit(limit + 1)
        .find_also_related(entity::user::Entity)
        .all(conn)
        .await
        .with_operation("load correction comments")?;

    let has_next = rows.len() > usize::try_from(limit).unwrap_or(usize::MAX);
    let items = rows
        .into_iter()
        .take(usize::try_from(limit).unwrap_or(usize::MAX))
        .map(|(comment, author)| {
            let author = author.ok_or_else(|| {
                Error::InvalidRequest(
                    "Comment author no longer exists".to_string(),
                )
            })?;
            Ok(CorrectionComment::from_models(comment, author))
        })
        .collect::<Result<Vec<_>, Error>>()?;

    let next_cursor = has_next.then(|| offset + limit_i32);

    Ok(CursorResponse { items, next_cursor })
}

pub(super) async fn insert_comment(
    conn: &impl ConnectionTrait,
    correction_id: i32,
    author_id: i32,
    req: &CreateCorrectionCommentRequest,
) -> Result<comment_entity::Model, Error> {
    validate_parent(conn, correction_id, req.parent_id).await?;

    comment_entity::Entity::insert(comment_entity::ActiveModel {
        id: NotSet,
        content: Set(req.content.clone()),
        state: Set(DbCommentState::Visable),
        author_id: Set(author_id),
        target: Set(DbCommentTarget::Correction),
        target_id: Set(correction_id),
        parent_id: Set(req.parent_id),
        created_at: NotSet,
        updated_at: NotSet,
    })
    .exec_with_returning(conn)
    .await
    .with_operation("insert correction comment")
    .map_err(Into::into)
}

pub(super) async fn find_comment(
    conn: &impl ConnectionTrait,
    comment_id: i32,
) -> Result<comment_entity::Model, Error> {
    comment_entity::Entity::find_by_id(comment_id)
        .one(conn)
        .await
        .with_operation("find correction comment")?
        .ok_or(Error::NotFound(NotFound::Comment))
}

pub(super) async fn load_comment_summary(
    conn: &impl ConnectionTrait,
    comment_id: i32,
) -> Result<CorrectionComment, Error> {
    let (comment, author) = comment_entity::Entity::find_by_id(comment_id)
        .find_also_related(entity::user::Entity)
        .one(conn)
        .await
        .with_operation("load correction comment summary")?
        .ok_or(Error::NotFound(NotFound::Comment))?;

    let author = author.ok_or_else(|| {
        Error::InvalidRequest("Comment author no longer exists".to_string())
    })?;

    Ok(CorrectionComment::from_models(comment, author))
}

pub(super) async fn soft_delete_comment(
    conn: &impl ConnectionTrait,
    comment: comment_entity::Model,
) -> Result<(), Error> {
    if comment.state == DbCommentState::Deleted {
        return Ok(());
    }

    let mut active = comment.into_active_model();
    active.state = Set(DbCommentState::Deleted);
    active
        .update(conn)
        .await
        .with_operation("soft delete correction comment")?;

    Ok(())
}

async fn validate_parent(
    conn: &impl ConnectionTrait,
    correction_id: i32,
    parent_id: Option<i32>,
) -> Result<(), Error> {
    let Some(parent_id) = parent_id else {
        return Ok(());
    };

    let parent = comment_entity::Entity::find_by_id(parent_id)
        .one(conn)
        .await
        .with_operation("validate correction comment parent")?
        .ok_or_else(|| {
            Error::InvalidRequest("Parent comment not found".to_string())
        })?;

    if parent.target != DbCommentTarget::Correction
        || parent.target_id != correction_id
    {
        return Err(Error::InvalidRequest(
            "Parent comment does not belong to this correction".to_string(),
        ));
    }

    Ok(())
}
