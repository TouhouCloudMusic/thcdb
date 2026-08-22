use std::collections::{HashMap, HashSet};

use domain::image::Image;
use domain::shared::Cursor;
use entity::enums::CommentState;
use entity::{comment, comment_target, comment_thread, image, user};
use infra_db::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use sea_orm::prelude::DateTimeWithTimeZone;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Select,
};
use sea_query::all;

use crate::CommentTarget;
use crate::comment_target::find_target;

pub async fn load_visible_comment_ids(
    conn: &impl ConnectionTrait,
    ids: impl IntoIterator<Item = i32>,
) -> Result<HashSet<i32>, DatabaseError> {
    let mut ids = ids.into_iter().peekable();
    if ids.peek().is_none() {
        return Ok(HashSet::new());
    }

    comment::Entity::find()
        .select_only()
        .column(comment::Column::Id)
        .filter(all![
            comment::Column::Id.is_in(ids),
            comment::Column::State.eq(CommentState::Visable),
        ])
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("load visible comment ids")
        .map(|ids| ids.into_iter().collect())
}

pub async fn load_thread_targets(
    conn: &impl ConnectionTrait,
    ids: impl IntoIterator<Item = i32>,
) -> Result<HashMap<i32, CommentTarget>, DatabaseError> {
    let mut ids = ids.into_iter().peekable();
    if ids.peek().is_none() {
        return Ok(HashMap::new());
    }

    let rows = comment_thread::Entity::find()
        .filter(comment_thread::Column::Id.is_in(ids))
        .find_also_related(comment_target::Entity)
        .all(conn)
        .await
        .db_operation("load comment thread targets")?;

    rows.into_iter()
        .map(|(thread, target)| {
            let target = target.ok_or_else(|| {
                DatabaseError::broken_reference(BrokenEntityReference {
                    entity: "comment_target",
                    id: thread.target_id,
                })
            })?;

            Ok((thread.id, CommentTarget::from(&target)))
        })
        .collect()
}

pub struct CommentRecord {
    pub id: i32,
    pub in_reply_to_comment_id: Option<i32>,
    pub author_id: i32,
    pub author_name: String,
    pub avatar: Option<Image>,
    pub content: String,
    pub state: CommentState,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

impl CommentRecord {
    fn new(
        comment: comment::Model,
        author: user::Model,
        avatar: Option<image::Model>,
    ) -> Self {
        Self {
            id: comment.id,
            in_reply_to_comment_id: comment.in_reply_to_comment_id,
            author_id: author.id,
            author_name: author.name,
            avatar: avatar.map(Into::into),
            content: comment.content,
            state: comment.state,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
        }
    }
}

#[derive(Default)]
pub struct CommentRecordPage {
    pub items: Vec<CommentRecord>,
    pub next_cursor: Option<i32>,
    pub active_count: u64,
}

impl CommentRecordPage {
    pub async fn load(
        conn: &impl ConnectionTrait,
        target: CommentTarget,
        cursor: Cursor,
    ) -> Result<Self, DatabaseError> {
        let Some(target) = find_target(conn, target).await? else {
            return Ok(Self::default());
        };
        let Some(thread) = find_thread_by_target_id(conn, target.id).await?
        else {
            return Ok(Self::default());
        };

        load_comments_page(conn, thread.id, cursor).await
    }
}

async fn find_thread_by_target_id(
    conn: &impl ConnectionTrait,
    target_id: i32,
) -> Result<Option<comment_thread::Model>, DatabaseError> {
    comment_thread::Entity::find()
        .filter(comment_thread::Column::TargetId.eq(target_id))
        .one(conn)
        .await
        .db_operation("find comment thread")
}

async fn load_comments_page(
    conn: &impl ConnectionTrait,
    thread_id: i32,
    cursor: Cursor,
) -> Result<CommentRecordPage, DatabaseError> {
    let rows = comment::Entity::find()
        .filter(comment::Column::ThreadId.eq(thread_id))
        .order_by_asc(comment::Column::Id)
        .offset(cursor.offset())
        .limit(u64::from(cursor.limit) + 1)
        .find_also_related(user::Entity)
        .all(conn)
        .await
        .db_operation("load comments")?;

    let page = cursor.into_offset_response(rows);
    let rows = page
        .items
        .into_iter()
        .map(|(comment, author)| {
            let author = author.ok_or_else(|| {
                DatabaseError::broken_reference(BrokenEntityReference {
                    entity: "user",
                    id: comment.author_id,
                })
            })?;
            Ok((comment, author))
        })
        .collect::<Result<Vec<_>, DatabaseError>>()?;

    let avatar_ids = rows
        .iter()
        .filter_map(|(_, author)| author.avatar_id)
        .collect::<HashSet<_>>();
    let avatars = load_author_avatars(conn, avatar_ids).await?;

    let items = rows
        .into_iter()
        .map(|(comment, author)| {
            let avatar = author
                .avatar_id
                .and_then(|id| avatars.iter().find(|avatar| avatar.id == id))
                .cloned();
            CommentRecord::new(comment, author, avatar)
        })
        .collect();

    let active_count = comment::Entity::find()
        .filter(all![
            comment::Column::ThreadId.eq(thread_id),
            comment::Column::State.eq(CommentState::Visable),
        ])
        .count(conn)
        .await
        .db_operation("count active comments")?;

    Ok(CommentRecordPage {
        items,
        next_cursor: page.next_cursor,
        active_count,
    })
}

async fn load_author_avatars(
    conn: &impl ConnectionTrait,
    avatar_ids: HashSet<i32>,
) -> Result<Vec<image::Model>, DatabaseError> {
    if avatar_ids.is_empty() {
        return Ok(Vec::new());
    }

    image::Entity::find()
        .filter(image::Column::Id.is_in(avatar_ids))
        .all(conn)
        .await
        .db_operation("load comment author avatars")
}

pub(crate) async fn find_active_comment_in_thread(
    conn: &impl ConnectionTrait,
    comment_id: i32,
    thread_id: i32,
) -> Result<Option<comment::Model>, DatabaseError> {
    comment_in_thread(comment_id, thread_id)
        .filter(comment::Column::State.eq(CommentState::Visable))
        .one(conn)
        .await
        .db_operation("load active comment in thread")
}

pub async fn find_comment_in_thread(
    conn: &impl ConnectionTrait,
    comment_id: i32,
    thread_id: i32,
) -> Result<Option<comment::Model>, DatabaseError> {
    comment_in_thread(comment_id, thread_id)
        .one(conn)
        .await
        .db_operation("load comment in thread")
}

fn comment_in_thread(
    comment_id: i32,
    thread_id: i32,
) -> Select<comment::Entity> {
    comment::Entity::find_by_id(comment_id)
        .filter(comment::Column::ThreadId.eq(thread_id))
}

pub async fn find_comment(
    conn: &impl ConnectionTrait,
    comment_id: i32,
) -> Result<Option<comment::Model>, DatabaseError> {
    comment::Entity::find_by_id(comment_id)
        .one(conn)
        .await
        .db_operation("find comment")
}

pub async fn load_comment(
    conn: &impl ConnectionTrait,
    comment_id: i32,
) -> Result<CommentRecord, DatabaseError> {
    let (comment, author) = comment::Entity::find_by_id(comment_id)
        .find_also_related(user::Entity)
        .one(conn)
        .await
        .db_operation("load comment summary")?
        .ok_or_else(|| {
            DatabaseError::broken_reference(BrokenEntityReference {
                entity: "comment",
                id: comment_id,
            })
        })?;

    let author = author.ok_or_else(|| {
        DatabaseError::broken_reference(BrokenEntityReference {
            entity: "user",
            id: comment.author_id,
        })
    })?;

    let avatar = match author.avatar_id {
        Some(avatar_id) => image::Entity::find_by_id(avatar_id)
            .one(conn)
            .await
            .db_operation("load comment author avatar")?,
        None => None,
    };

    Ok(CommentRecord::new(comment, author, avatar))
}
