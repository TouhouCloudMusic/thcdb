use std::collections::HashSet;

use entity::enums::CommentState as DbCommentState;
use entity::{
    artist as artist_entity, comment as comment_entity, comment_target,
    comment_thread, correction as correction_entity, event as event_entity,
    image as image_entity, label as label_entity, release as release_entity,
    song as song_entity, tag as tag_entity,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
};

use super::error::{Error, NotFound};
use super::model::{
    CommentTarget, CreateEntityCommentRequest, EntityComment, EntityCommentPage,
};
use crate::domain::shared::Cursor;
use crate::infra::database::error::DatabaseResultExt;

impl CommentTarget {
    pub(super) async fn exists(
        self,
        conn: &impl ConnectionTrait,
        target_id: i32,
    ) -> Result<bool, Error> {
        let exists = match self {
            Self::Artist => artist_entity::Entity::find_by_id(target_id)
                .one(conn)
                .await
                .db_operation("check comment artist target exists")?
                .is_some(),
            Self::Release => release_entity::Entity::find_by_id(target_id)
                .one(conn)
                .await
                .db_operation("check comment release target exists")?
                .is_some(),
            Self::Song => song_entity::Entity::find_by_id(target_id)
                .one(conn)
                .await
                .db_operation("check comment song target exists")?
                .is_some(),
            Self::Label => label_entity::Entity::find_by_id(target_id)
                .one(conn)
                .await
                .db_operation("check comment label target exists")?
                .is_some(),
            Self::Event => event_entity::Entity::find_by_id(target_id)
                .one(conn)
                .await
                .db_operation("check comment event target exists")?
                .is_some(),
            Self::Tag => tag_entity::Entity::find_by_id(target_id)
                .one(conn)
                .await
                .db_operation("check comment tag target exists")?
                .is_some(),
            Self::Correction => {
                correction_entity::Entity::find_by_id(target_id)
                    .one(conn)
                    .await
                    .db_operation("check comment correction target exists")?
                    .is_some()
            }
        };

        Ok(exists)
    }

    const fn target_column(self) -> comment_target::Column {
        match self {
            Self::Artist => comment_target::Column::ArtistId,
            Self::Release => comment_target::Column::ReleaseId,
            Self::Song => comment_target::Column::SongId,
            Self::Label => comment_target::Column::LabelId,
            Self::Event => comment_target::Column::EventId,
            Self::Tag => comment_target::Column::TagId,
            Self::Correction => comment_target::Column::CorrectionId,
        }
    }

    fn target_active_model(
        self,
        target_id: i32,
    ) -> comment_target::ActiveModel {
        let mut target_ref = comment_target::ActiveModel {
            id: NotSet,
            ..Default::default()
        };

        match self {
            Self::Artist => target_ref.artist_id = Set(Some(target_id)),
            Self::Release => target_ref.release_id = Set(Some(target_id)),
            Self::Song => target_ref.song_id = Set(Some(target_id)),
            Self::Label => target_ref.label_id = Set(Some(target_id)),
            Self::Event => target_ref.event_id = Set(Some(target_id)),
            Self::Tag => target_ref.tag_id = Set(Some(target_id)),
            Self::Correction => {
                target_ref.correction_id = Set(Some(target_id));
            }
        }

        target_ref
    }
}

pub(super) async fn find_target(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
    target_id: i32,
) -> Result<Option<comment_target::Model>, Error> {
    comment_target::Entity::find()
        .filter(target.target_column().eq(target_id))
        .one(conn)
        .await
        .db_operation("find comment target_ref")
        .map_err(Into::into)
}

async fn get_or_create_target(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
    target_id: i32,
) -> Result<comment_target::Model, Error> {
    let target_column = target.target_column();
    let mut inserted =
        comment_target::Entity::insert(target.target_active_model(target_id))
            .on_conflict(
                OnConflict::column(target_column).do_nothing().to_owned(),
            )
            .exec_with_returning_many(conn)
            .await
            .db_operation("create comment target_ref")
            .map_err(Error::from)?;

    if let Some(target_ref) = inserted.pop() {
        return Ok(target_ref);
    }

    find_target(conn, target, target_id)
        .await?
        .ok_or_else(|| Error::target_not_found(target))
}

async fn find_thread_by_target_id(
    conn: &impl ConnectionTrait,
    target_id: i32,
) -> Result<Option<comment_thread::Model>, Error> {
    comment_thread::Entity::find()
        .filter(comment_thread::Column::TargetId.eq(target_id))
        .one(conn)
        .await
        .db_operation("find comment thread")
        .map_err(Into::into)
}

pub(super) async fn get_or_create_thread(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
    target_id: i32,
) -> Result<comment_thread::Model, Error> {
    let target_ref = get_or_create_target(conn, target, target_id).await?;
    let mut inserted =
        comment_thread::Entity::insert(comment_thread::ActiveModel {
            id: NotSet,
            target_id: Set(target_ref.id),
        })
        .on_conflict(
            OnConflict::column(comment_thread::Column::TargetId)
                .do_nothing()
                .to_owned(),
        )
        .exec_with_returning_many(conn)
        .await
        .db_operation("create comment thread")
        .map_err(Error::from)?;

    if let Some(thread) = inserted.pop() {
        return Ok(thread);
    }

    find_thread_by_target_id(conn, target_ref.id)
        .await?
        .ok_or_else(|| Error::target_not_found(target))
}

pub(super) async fn load_target_comments_page(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
    target_id: i32,
    cursor: Cursor,
) -> Result<EntityCommentPage, Error> {
    let Some(target_ref) = find_target(conn, target, target_id).await? else {
        return Ok(EntityCommentPage::default());
    };
    let Some(thread) = find_thread_by_target_id(conn, target_ref.id).await?
    else {
        return Ok(EntityCommentPage::default());
    };

    load_comments_page(conn, thread.id, cursor).await
}

async fn load_comments_page(
    conn: &impl ConnectionTrait,
    thread_id: i32,
    cursor: Cursor,
) -> Result<EntityCommentPage, Error> {
    let rows = comment_entity::Entity::find()
        .filter(comment_entity::Column::ThreadId.eq(thread_id))
        .order_by_asc(comment_entity::Column::CreatedAt)
        .order_by_asc(comment_entity::Column::Id)
        .offset(cursor.offset())
        .limit(u64::from(cursor.limit) + 1)
        .find_also_related(entity::user::Entity)
        .all(conn)
        .await
        .db_operation("load comments")?;

    let page = cursor.into_offset_response(rows);
    let rows = page
        .items
        .into_iter()
        .map(|(comment, author)| {
            let author = author.ok_or_else(|| {
                Error::InvalidRequest(
                    "Comment author no longer exists".to_string(),
                )
            })?;
            Ok((comment, author))
        })
        .collect::<Result<Vec<_>, Error>>()?;
    let avatar_ids = rows
        .iter()
        .filter_map(|(_, author)| author.avatar_id)
        .collect::<HashSet<_>>();
    let avatars = load_author_avatars(conn, avatar_ids).await?;
    let items = rows
        .into_iter()
        .map(|(comment, author)| {
            let avatar = author.avatar_id.and_then(|avatar_id| {
                avatars.iter().find(|avatar| avatar.id == avatar_id)
            });
            EntityComment::from_models(comment, author, avatar)
        })
        .collect();
    let active_count = comment_entity::Entity::find()
        .filter(comment_entity::Column::ThreadId.eq(thread_id))
        .filter(comment_entity::Column::State.eq(DbCommentState::Visable))
        .count(conn)
        .await
        .db_operation("count active comments")?;

    Ok(EntityCommentPage {
        items,
        next_cursor: page.next_cursor,
        active_count,
    })
}

async fn load_author_avatars(
    conn: &impl ConnectionTrait,
    avatar_ids: HashSet<i32>,
) -> Result<Vec<image_entity::Model>, Error> {
    if avatar_ids.is_empty() {
        return Ok(Vec::default());
    }

    image_entity::Entity::find()
        .filter(image_entity::Column::Id.is_in(avatar_ids))
        .all(conn)
        .await
        .db_operation("load comment author avatars")
        .map_err(Into::into)
}

pub(super) async fn insert_comment(
    conn: &impl ConnectionTrait,
    thread_id: i32,
    author_id: i32,
    req: &CreateEntityCommentRequest,
) -> Result<comment_entity::Model, Error> {
    comment_entity::Entity::insert(comment_entity::ActiveModel {
        id: NotSet,
        content: Set(req.content.clone()),
        state: Set(DbCommentState::Visable),
        author_id: Set(author_id),
        thread_id: Set(thread_id),
        parent_id: Set(req.parent_id),
        created_at: NotSet,
        updated_at: NotSet,
    })
    .exec_with_returning(conn)
    .await
    .db_operation("insert comment")
    .map_err(Into::into)
}

pub(super) async fn active_comment_belongs_to_thread(
    conn: &impl ConnectionTrait,
    comment_id: i32,
    thread_id: i32,
) -> Result<bool, Error> {
    let exists = comment_entity::Entity::find()
        .filter(comment_entity::Column::Id.eq(comment_id))
        .filter(comment_entity::Column::ThreadId.eq(thread_id))
        .filter(comment_entity::Column::State.eq(DbCommentState::Visable))
        .one(conn)
        .await
        .db_operation("validate comment parent")?
        .is_some();

    Ok(exists)
}

pub(super) async fn find_comment(
    conn: &impl ConnectionTrait,
    comment_id: i32,
) -> Result<comment_entity::Model, Error> {
    comment_entity::Entity::find_by_id(comment_id)
        .one(conn)
        .await
        .db_operation("find comment")?
        .ok_or(Error::NotFound(NotFound::Comment))
}

pub(super) async fn load_comment_summary(
    conn: &impl ConnectionTrait,
    comment_id: i32,
) -> Result<EntityComment, Error> {
    let (comment, author) = comment_entity::Entity::find_by_id(comment_id)
        .find_also_related(entity::user::Entity)
        .one(conn)
        .await
        .db_operation("load comment summary")?
        .ok_or(Error::NotFound(NotFound::Comment))?;

    let author = author.ok_or_else(|| {
        Error::InvalidRequest("Comment author no longer exists".to_string())
    })?;
    let avatar = match author.avatar_id {
        Some(avatar_id) => image_entity::Entity::find_by_id(avatar_id)
            .one(conn)
            .await
            .db_operation("load comment author avatar")?,
        None => None,
    };

    Ok(EntityComment::from_models(comment, author, avatar.as_ref()))
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
        .db_operation("soft delete comment")?;

    Ok(())
}
