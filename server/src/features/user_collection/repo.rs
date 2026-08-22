use std::collections::HashMap;

use chrono::{DateTime, FixedOffset};
use domain::image::Image as DomainImage;
use domain::shared::{DateWithPrecision, PageResponse, SimpleArtist};
use entity::enums::EntityType;
use entity::sea_orm_active_enums::{ArtistImageType, ReleaseImageType};
use entity::{
    artist as artist_entity, artist_image as artist_image_entity,
    event as event_entity, image as image_entity, label as label_entity,
    release as release_entity, release_artist as release_artist_entity,
    release_image as release_image_entity,
    release_track as release_track_entity, song as song_entity,
    song_artist as song_artist_entity, tag as tag_entity, user as user_entity,
    user_collection as user_collection_entity,
    user_collection_follow as user_collection_follow_entity,
    user_collection_item as user_collection_item_entity,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Expr;
use sea_orm::{
    ActiveEnum, ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    FromQueryResult, IntoActiveModel, LoaderTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, QueryTrait, Select, TryInsert, TryInsertResult,
};
use sea_query::{
    Alias, ExprTrait, Func, JoinType, OnConflict, Order, Query,
    SelectStatement, all, any,
};

use super::error::{Error, NotFound};
use super::model::{
    ArtistSummary, CreateUserCollectionItemRequest, EntitySummary,
    EntityUserCollectionSort, EventSummary, FollowedUserCollection,
    LabelSummary, ReleaseSummary, SongSummary, TagSummary, UserCollection,
    UserCollectionItem, UserCollectionItemDetail, UserCollectionItemEntityType,
    UserCollectionMutationRequest, UserCollectionOwner,
};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::http::PageQuery;

#[derive(Debug, Clone, FromQueryResult)]
struct UserCollectionSummaryRow {
    id: i32,
    name: String,
    description: String,
    is_public: bool,
    owner_id: i32,
    owner_name: String,
    owner_avatar_url_dir: Option<String>,
    owner_avatar_url_filename: Option<String>,
    item_count: i64,
    follower_count: i64,
    is_following: Option<bool>,
    followed_at: Option<DateTime<FixedOffset>>,
}

#[derive(Debug, FromQueryResult)]
struct CountRow {
    count: i64,
}

#[derive(Debug, FromQueryResult)]
struct CollectionIdRow {
    id: i32,
}

impl From<UserCollectionSummaryRow> for UserCollection {
    fn from(row: UserCollectionSummaryRow) -> Self {
        let avatar_url = if let Some(dir) = row.owner_avatar_url_dir
            && let Some(filename) = row.owner_avatar_url_filename
        {
            Some(
                std::path::PathBuf::from(dir)
                    .join(filename)
                    .to_string_lossy()
                    .to_string(),
            )
        } else {
            None
        };

        Self {
            id: row.id,
            owner: UserCollectionOwner {
                id: row.owner_id,
                name: row.owner_name,
                avatar_url,
            },
            name: row.name,
            description: row.description,
            is_public: row.is_public,
            item_count: u64::try_from(row.item_count).unwrap_or(u64::MAX),
            follower_count: u64::try_from(row.follower_count)
                .unwrap_or(u64::MAX),
            is_following: row.is_following,
            followed_at: row.followed_at,
        }
    }
}

pub(super) async fn find_requested_user_by_name(
    conn: &impl ConnectionTrait,
    username: &str,
) -> Result<user_entity::Model, Error> {
    user_entity::Entity::find()
        .filter(user_entity::Column::Name.eq(username))
        .one(conn)
        .await
        .db_operation("find requested collection user")?
        .ok_or(Error::NotFound(NotFound::RequestedUser))
}

pub(super) async fn load_user_collections_page(
    conn: &impl ConnectionTrait,
    select: Select<user_collection_entity::Entity>,
    viewer_id: Option<i32>,
    page_query: PageQuery,
) -> Result<PageResponse<UserCollection>, Error> {
    let total_items = select
        .clone()
        .count(conn)
        .await
        .db_operation("count user collections")?;

    let items = load_user_collection_summaries(
        conn,
        select
            .order_by_desc(user_collection_entity::Column::Id)
            .offset(page_query.offset())
            .limit(u64::from(page_query.limit())),
        viewer_id,
    )
    .await?;

    Ok(page_query.to_response(items, total_items))
}

pub(super) async fn load_user_collection_detail(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    viewer_id: Option<i32>,
) -> Result<UserCollection, Error> {
    load_user_collection_summaries(
        conn,
        user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::Id.eq(collection_id)),
        viewer_id,
    )
    .await?
    .into_iter()
    .next()
    .ok_or(Error::NotFound(NotFound::Collection))
}

pub(super) async fn load_entity_user_collections_page(
    conn: &impl ConnectionTrait,
    entity_type: EntityType,
    entity_id: i32,
    viewer_id: Option<i32>,
    sort: EntityUserCollectionSort,
    page_query: PageQuery,
) -> Result<PageResponse<UserCollection>, Error> {
    let total_items =
        count_entity_user_collections(conn, entity_type, entity_id, viewer_id)
            .await?;
    let ids = load_entity_user_collection_ids(
        conn,
        entity_type,
        entity_id,
        viewer_id,
        sort,
        &page_query,
    )
    .await?;

    let collections = load_user_collection_summaries(
        conn,
        user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::Id.is_in(ids.clone())),
        viewer_id,
    )
    .await?
    .into_iter()
    .map(|collection| (collection.id, collection))
    .collect::<HashMap<_, _>>();

    let items = ids
        .into_iter()
        .filter_map(|id| collections.get(&id).cloned())
        .collect();

    Ok(page_query.to_response(items, total_items))
}

async fn count_entity_user_collections(
    conn: &impl ConnectionTrait,
    entity_type: EntityType,
    entity_id: i32,
    viewer_id: Option<i32>,
) -> Result<u64, Error> {
    let mut query = Query::select();
    query
        .expr_as(
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::UserCollectionId,
            ))
            .count_distinct(),
            Alias::new("count"),
        )
        .from(user_collection_item_entity::Entity)
        .inner_join(
            user_collection_entity::Entity,
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::UserCollectionId,
            ))
            .equals((
                user_collection_entity::Entity,
                user_collection_entity::Column::Id,
            )),
        )
        .and_where(
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::EntityType,
            ))
            .eq(<EntityType as ActiveEnum>::as_enum(&entity_type)),
        )
        .and_where(
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::EntityId,
            ))
            .eq(entity_id),
        );
    query.cond_where(visible_user_collection_condition(viewer_id));

    let stmt = conn.get_database_backend().build(&query);
    let count = CountRow::find_by_statement(stmt)
        .one(conn)
        .await
        .db_operation("count entity user collections")?
        .map(|row| row.count)
        .unwrap_or_default();

    Ok(u64::try_from(count).unwrap_or(u64::MAX))
}

async fn load_entity_user_collection_ids(
    conn: &impl ConnectionTrait,
    entity_type: EntityType,
    entity_id: i32,
    viewer_id: Option<i32>,
    sort: EntityUserCollectionSort,
    page_query: &PageQuery,
) -> Result<Vec<i32>, Error> {
    let mut query = Query::select();
    query
        .expr(Expr::col((
            user_collection_entity::Entity,
            user_collection_entity::Column::Id,
        )))
        .from(user_collection_entity::Entity)
        .inner_join(
            user_collection_item_entity::Entity,
            Expr::col((
                user_collection_entity::Entity,
                user_collection_entity::Column::Id,
            ))
            .equals((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::UserCollectionId,
            )),
        )
        .left_join(
            user_collection_follow_entity::Entity,
            Expr::col((
                user_collection_entity::Entity,
                user_collection_entity::Column::Id,
            ))
            .equals((
                user_collection_follow_entity::Entity,
                user_collection_follow_entity::Column::CollectionId,
            )),
        )
        .and_where(
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::EntityType,
            ))
            .eq(<EntityType as ActiveEnum>::as_enum(&entity_type)),
        )
        .and_where(
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::EntityId,
            ))
            .eq(entity_id),
        )
        .group_by_col((
            user_collection_entity::Entity,
            user_collection_entity::Column::Id,
        ));
    query.cond_where(visible_user_collection_condition(viewer_id));

    match sort {
        EntityUserCollectionSort::CollectedAt => {
            query.order_by_expr(
                Expr::col((
                    user_collection_item_entity::Entity,
                    user_collection_item_entity::Column::Id,
                ))
                .max(),
                Order::Desc,
            );
        }
        EntityUserCollectionSort::FollowerCount => {
            query.order_by_expr(
                Expr::col((
                    user_collection_follow_entity::Entity,
                    user_collection_follow_entity::Column::UserId,
                ))
                .count_distinct(),
                Order::Desc,
            );
        }
    }

    query
        .order_by(
            (
                user_collection_entity::Entity,
                user_collection_entity::Column::Id,
            ),
            Order::Desc,
        )
        .offset(page_query.offset())
        .limit(u64::from(page_query.limit()));

    let stmt = conn.get_database_backend().build(&query);
    let rows = CollectionIdRow::find_by_statement(stmt)
        .all(conn)
        .await
        .db_operation("load entity user collection ids")?;

    Ok(rows.into_iter().map(|row| row.id).collect())
}

fn visible_user_collection_condition(
    viewer_id: Option<i32>,
) -> sea_query::Condition {
    let public_collection = Expr::col((
        user_collection_entity::Entity,
        user_collection_entity::Column::IsPublic,
    ))
    .eq(true);

    let Some(viewer_id) = viewer_id else {
        return all![public_collection];
    };

    any![
        public_collection,
        Expr::col((
            user_collection_entity::Entity,
            user_collection_entity::Column::UserId,
        ))
        .eq(viewer_id),
    ]
}

async fn load_user_collection_summaries(
    conn: &impl ConnectionTrait,
    select: Select<user_collection_entity::Entity>,
    viewer_id: Option<i32>,
) -> Result<Vec<UserCollection>, Error> {
    let stmt = conn
        .get_database_backend()
        .build(&build_user_collection_summary_query(select, viewer_id));
    let rows = UserCollectionSummaryRow::find_by_statement(stmt)
        .all(conn)
        .await
        .db_operation("load user collection summaries")?;

    Ok(rows.into_iter().map(Into::into).collect())
}

fn build_user_collection_summary_query(
    select: Select<user_collection_entity::Entity>,
    viewer_id: Option<i32>,
) -> SelectStatement {
    let collections_alias = Alias::new("user_collections");
    let mut query = Query::select();

    select_user_collection_summary_fields(&mut query, &collections_alias);
    query.from_subquery(select.into_query(), collections_alias.clone());
    join_user_collection_summary_tables(&mut query, &collections_alias);
    group_user_collection_summary(&mut query, &collections_alias);
    select_viewer_follow_state(&mut query, &collections_alias, viewer_id);
    query.order_by(
        (
            collections_alias.clone(),
            user_collection_entity::Column::Id,
        ),
        Order::Desc,
    );

    query.clone()
}

fn select_user_collection_summary_fields(
    query: &mut SelectStatement,
    collections_alias: &Alias,
) {
    let avatar_alias = Alias::new("avatar_image");
    query
        .expr(Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Id,
        )))
        .expr(Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Name,
        )))
        .expr(Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Description,
        )))
        .expr(Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::IsPublic,
        )))
        .expr_as(
            Expr::col((user_entity::Entity, user_entity::Column::Id)),
            Alias::new("owner_id"),
        )
        .expr_as(
            Expr::col((user_entity::Entity, user_entity::Column::Name)),
            Alias::new("owner_name"),
        )
        .expr_as(
            Expr::col((avatar_alias.clone(), image_entity::Column::Directory)),
            Alias::new("owner_avatar_url_dir"),
        )
        .expr_as(
            Expr::col((avatar_alias, image_entity::Column::Filename)),
            Alias::new("owner_avatar_url_filename"),
        )
        .expr_as(
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::Id,
            ))
            .count_distinct(),
            Alias::new("item_count"),
        )
        .expr_as(
            visible_follower_count_expr(collections_alias),
            Alias::new("follower_count"),
        );
}

fn visible_follower_count_expr(
    collections_alias: &Alias,
) -> sea_query::SimpleExpr {
    Func::coalesce([
        Expr::case(
            Expr::col((
                collections_alias.clone(),
                user_collection_entity::Column::IsPublic,
            ))
            .eq(true),
            Expr::col((
                user_collection_follow_entity::Entity,
                user_collection_follow_entity::Column::UserId,
            ))
            .count_distinct(),
        )
        .finally(0)
        .cast_as("bigint"),
        Expr::val(0_i64).into(),
    ])
    .into()
}

fn join_user_collection_summary_tables(
    query: &mut SelectStatement,
    collections_alias: &Alias,
) {
    let avatar_alias = Alias::new("avatar_image");
    query
        .inner_join(
            user_entity::Entity,
            Expr::col((
                collections_alias.clone(),
                user_collection_entity::Column::UserId,
            ))
            .equals((user_entity::Entity, user_entity::Column::Id)),
        )
        .join_as(
            JoinType::LeftJoin,
            image_entity::Entity,
            avatar_alias.clone(),
            Expr::col((user_entity::Entity, user_entity::Column::AvatarId))
                .equals((avatar_alias, image_entity::Column::Id)),
        )
        .left_join(
            user_collection_item_entity::Entity,
            Expr::col((
                collections_alias.clone(),
                user_collection_entity::Column::Id,
            ))
            .equals((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::UserCollectionId,
            )),
        )
        .left_join(
            user_collection_follow_entity::Entity,
            Expr::col((
                collections_alias.clone(),
                user_collection_entity::Column::Id,
            ))
            .equals((
                user_collection_follow_entity::Entity,
                user_collection_follow_entity::Column::CollectionId,
            )),
        );
}

fn group_user_collection_summary(
    query: &mut SelectStatement,
    collections_alias: &Alias,
) {
    let avatar_alias = Alias::new("avatar_image");
    query.add_group_by([
        Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Id,
        ))
        .into(),
        Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::UserId,
        ))
        .into(),
        Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Name,
        ))
        .into(),
        Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Description,
        ))
        .into(),
        Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::IsPublic,
        ))
        .into(),
        Expr::col((user_entity::Entity, user_entity::Column::Id)).into(),
        Expr::col((user_entity::Entity, user_entity::Column::Name)).into(),
        Expr::col((avatar_alias.clone(), image_entity::Column::Directory))
            .into(),
        Expr::col((avatar_alias, image_entity::Column::Filename)).into(),
    ]);
}

fn select_viewer_follow_state(
    query: &mut SelectStatement,
    collections_alias: &Alias,
    viewer_id: Option<i32>,
) {
    let Some(viewer_id) = viewer_id else {
        query
            .expr_as(
                Expr::val(Option::<bool>::None),
                Alias::new("is_following"),
            )
            .expr_as(
                Expr::val(Option::<DateTime<FixedOffset>>::None),
                Alias::new("followed_at"),
            );
        return;
    };

    let followed_by_viewer_alias = Alias::new("followed_by_viewer");
    query
        .expr_as(
            Expr::col((
                followed_by_viewer_alias.clone(),
                user_collection_follow_entity::Column::UserId,
            ))
            .count_distinct()
            .gt(0),
            Alias::new("is_following"),
        )
        .expr_as(
            Expr::col((
                followed_by_viewer_alias.clone(),
                user_collection_follow_entity::Column::FollowedAt,
            ))
            .max(),
            Alias::new("followed_at"),
        )
        .join_as(
            JoinType::LeftJoin,
            user_collection_follow_entity::Entity,
            followed_by_viewer_alias.clone(),
            Expr::col((
                collections_alias.clone(),
                user_collection_entity::Column::Id,
            ))
            .equals((
                followed_by_viewer_alias.clone(),
                user_collection_follow_entity::Column::CollectionId,
            ))
            .and(
                Expr::col((
                    followed_by_viewer_alias,
                    user_collection_follow_entity::Column::UserId,
                ))
                .eq(viewer_id),
            ),
        );
}

pub(super) async fn follow_user_collection(
    conn: &impl ConnectionTrait,
    user_id: i32,
    collection_id: i32,
) -> Result<bool, Error> {
    let result = TryInsert::one(user_collection_follow_entity::ActiveModel {
        user_id: Set(user_id),
        collection_id: Set(collection_id),
        followed_at: NotSet,
    })
    .on_conflict(
        OnConflict::columns([
            user_collection_follow_entity::Column::UserId,
            user_collection_follow_entity::Column::CollectionId,
        ])
        .do_nothing()
        .to_owned(),
    )
    .exec(conn)
    .await
    .db_operation("follow user collection")?;

    match result {
        TryInsertResult::Inserted(_) => Ok(true),
        TryInsertResult::Conflicted => Ok(false),
        TryInsertResult::Empty => Err(Error::InvalidRequest(
            "Follow user collection insert was empty".to_string(),
        )),
    }
}

pub(super) async fn unfollow_user_collection(
    conn: &impl ConnectionTrait,
    user_id: i32,
    collection_id: i32,
) -> Result<(), Error> {
    user_collection_follow_entity::Entity::delete_many()
        .filter(all![
            user_collection_follow_entity::Column::UserId.eq(user_id),
            user_collection_follow_entity::Column::CollectionId
                .eq(collection_id),
        ])
        .exec(conn)
        .await
        .db_operation("unfollow user collection")?;
    Ok(())
}

pub(super) async fn load_followed_user_collections_page(
    conn: &impl ConnectionTrait,
    user_id: i32,
    page_query: PageQuery,
) -> Result<PageResponse<FollowedUserCollection>, Error> {
    let base_select = user_collection_entity::Entity::find()
        .inner_join(user_collection_follow_entity::Entity)
        .filter(all![
            user_collection_follow_entity::Column::UserId.eq(user_id),
            user_collection_entity::Column::IsPublic.eq(true),
        ]);

    let total_items = base_select
        .clone()
        .count(conn)
        .await
        .db_operation("count followed user collections")?;

    let followed = user_collection_follow_entity::Entity::find()
        .inner_join(user_collection_entity::Entity)
        .filter(all![
            user_collection_follow_entity::Column::UserId.eq(user_id),
            user_collection_entity::Column::IsPublic.eq(true),
        ])
        .order_by_desc(user_collection_follow_entity::Column::FollowedAt)
        .offset(page_query.offset())
        .limit(u64::from(page_query.limit()))
        .all(conn)
        .await
        .db_operation("load followed user collection ids")?;

    let collection_ids: Vec<i32> =
        followed.iter().map(|follow| follow.collection_id).collect();

    let collections = load_user_collection_summaries(
        conn,
        user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::Id.is_in(collection_ids)),
        Some(user_id),
    )
    .await?
    .into_iter()
    .map(|collection| (collection.id, collection))
    .collect::<HashMap<_, _>>();

    let items = followed
        .into_iter()
        .filter_map(|follow| {
            collections
                .get(&follow.collection_id)
                .cloned()
                .map(|collection| FollowedUserCollection {
                    followed_at: follow.followed_at,
                    collection,
                })
        })
        .collect();

    Ok(page_query.to_response(items, total_items))
}

pub(super) async fn load_user_collection_items_page(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    page_query: PageQuery,
) -> Result<PageResponse<UserCollectionItemDetail>, Error> {
    let select = user_collection_item_entity::Entity::find().filter(
        user_collection_item_entity::Column::UserCollectionId.eq(collection_id),
    );
    let total_items = select
        .clone()
        .count(conn)
        .await
        .db_operation("count user collection items")?;

    let items: Vec<UserCollectionItem> = select
        .order_by_asc(user_collection_item_entity::Column::SortKey)
        .order_by_asc(user_collection_item_entity::Column::Id)
        .offset(page_query.offset())
        .limit(u64::from(page_query.limit()))
        .all(conn)
        .await
        .db_operation("load user collection items page")?
        .into_iter()
        .map(Into::into)
        .collect();

    let mut artist_ids: Vec<i32> = Vec::new();
    let mut release_ids: Vec<i32> = Vec::new();
    let mut song_ids: Vec<i32> = Vec::new();
    let mut tag_ids: Vec<i32> = Vec::new();
    let mut event_ids: Vec<i32> = Vec::new();
    let mut label_ids: Vec<i32> = Vec::new();

    for item in &items {
        let Some(entity_id) = item.entity_id else {
            continue;
        };
        match item.entity_type {
            EntityType::Artist => artist_ids.push(entity_id),
            EntityType::Release => release_ids.push(entity_id),
            EntityType::Song => song_ids.push(entity_id),
            EntityType::Tag => tag_ids.push(entity_id),
            EntityType::Event => event_ids.push(entity_id),
            EntityType::Label => label_ids.push(entity_id),
            EntityType::SongLyrics | EntityType::CreditRole => {}
        }
    }

    let (artists, releases, songs, tags, events, labels) = tokio::try_join!(
        load_artist_summaries(&artist_ids, conn),
        load_release_summaries(&release_ids, conn),
        load_song_summaries(&song_ids, conn),
        load_tag_summaries(&tag_ids, conn),
        load_event_summaries(&event_ids, conn),
        load_label_summaries(&label_ids, conn),
    )?;

    let enriched = items
        .into_iter()
        .map(|item| {
            let entity =
                item.entity_id.and_then(|eid| match item.entity_type {
                    EntityType::Artist => {
                        artists.get(&eid).cloned().map(EntitySummary::Artist)
                    }
                    EntityType::Release => {
                        releases.get(&eid).cloned().map(EntitySummary::Release)
                    }
                    EntityType::Song => {
                        songs.get(&eid).cloned().map(EntitySummary::Song)
                    }
                    EntityType::Tag => {
                        tags.get(&eid).cloned().map(EntitySummary::Tag)
                    }
                    EntityType::Event => {
                        events.get(&eid).cloned().map(EntitySummary::Event)
                    }
                    EntityType::Label => {
                        labels.get(&eid).cloned().map(EntitySummary::Label)
                    }
                    EntityType::SongLyrics | EntityType::CreditRole => None,
                });
            UserCollectionItemDetail {
                id: item.id,
                entity_id: item.entity_id,
                entity_type: item.entity_type,
                description: item.description,
                entity,
            }
        })
        .collect();

    Ok(page_query.to_response(enriched, total_items))
}

pub(super) async fn find_visible_user_collection(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    viewer_id: Option<i32>,
) -> Result<user_collection_entity::Model, Error> {
    let collection = user_collection_entity::Entity::find_by_id(collection_id)
        .one(conn)
        .await
        .db_operation("find visible user collection")?
        .ok_or(Error::NotFound(NotFound::Collection))?;

    if collection.is_public || viewer_id == Some(collection.user_id) {
        Ok(collection)
    } else {
        Err(Error::NotFound(NotFound::Collection))
    }
}

pub(super) async fn find_owned_user_collection(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    owner_id: i32,
) -> Result<user_collection_entity::Model, Error> {
    let collection = user_collection_entity::Entity::find_by_id(collection_id)
        .one(conn)
        .await
        .db_operation("find owned user collection")?
        .ok_or(Error::NotFound(NotFound::Collection))?;

    if collection.user_id == owner_id {
        Ok(collection)
    } else {
        Err(Error::CollectionAccessDenied)
    }
}

pub(super) async fn lock_user_collection(
    conn: &impl ConnectionTrait,
    collection_id: i32,
) -> Result<user_collection_entity::Model, Error> {
    user_collection_entity::Entity::find_by_id(collection_id)
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("lock user collection")?
        .ok_or(Error::NotFound(NotFound::Collection))
}

pub(super) async fn insert_user_collection(
    conn: &impl ConnectionTrait,
    owner_id: i32,
    req: &UserCollectionMutationRequest,
) -> Result<user_collection_entity::Model, Error> {
    user_collection_entity::Entity::insert(
        user_collection_entity::ActiveModel {
            id: NotSet,
            user_id: Set(owner_id),
            name: Set(String::from(req.name.clone())),
            description: Set(req.description.clone()),
            is_public: Set(req.is_public),
        },
    )
    .exec_with_returning(conn)
    .await
    .db_operation("insert user collection")
    .map_err(Into::into)
}

pub(super) async fn update_user_collection(
    conn: &impl ConnectionTrait,
    model: user_collection_entity::Model,
    req: &UserCollectionMutationRequest,
) -> Result<(), Error> {
    let mut active = model.into_active_model();
    active.name = Set(String::from(req.name.clone()));
    active.description = Set(req.description.clone());
    active.is_public = Set(req.is_public);
    active
        .update(conn)
        .await
        .db_operation("update user collection")?;
    Ok(())
}

pub(super) async fn delete_user_collection(
    conn: &impl ConnectionTrait,
    collection_id: i32,
) -> Result<(), Error> {
    user_collection_entity::Entity::delete_by_id(collection_id)
        .exec(conn)
        .await
        .db_operation("delete user collection")?;
    Ok(())
}

macro_rules! check_entity_exists {
    ($entity:ident, $conn:expr, $id:expr) => {
        $entity::Entity::find_by_id($id)
            .one($conn)
            .await
            .db_operation("check user collection referenced entity exists")?
            .is_some()
    };
}

pub(super) async fn ensure_referenced_entity_exists(
    conn: &impl ConnectionTrait,
    entity_type: UserCollectionItemEntityType,
    entity_id: i32,
) -> Result<(), Error> {
    let exists = match entity_type {
        UserCollectionItemEntityType::Artist => {
            check_entity_exists!(artist_entity, conn, entity_id)
        }
        UserCollectionItemEntityType::Label => {
            check_entity_exists!(label_entity, conn, entity_id)
        }
        UserCollectionItemEntityType::Release => {
            check_entity_exists!(release_entity, conn, entity_id)
        }
        UserCollectionItemEntityType::Song => {
            check_entity_exists!(song_entity, conn, entity_id)
        }
        UserCollectionItemEntityType::Tag => {
            check_entity_exists!(tag_entity, conn, entity_id)
        }
        UserCollectionItemEntityType::Event => {
            check_entity_exists!(event_entity, conn, entity_id)
        }
    };

    if exists {
        Ok(())
    } else {
        Err(Error::NotFound(NotFound::ReferencedEntity))
    }
}

pub(super) async fn insert_user_collection_item(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    req: &CreateUserCollectionItemRequest,
) -> Result<user_collection_item_entity::Model, Error> {
    let last_item = user_collection_item_entity::Entity::find()
        .filter(
            user_collection_item_entity::Column::UserCollectionId
                .eq(collection_id),
        )
        .order_by_desc(user_collection_item_entity::Column::SortKey)
        .order_by_desc(user_collection_item_entity::Column::Id)
        .one(conn)
        .await
        .db_operation("find last user collection item")?;

    let sort_key = match last_item {
        None => 0,
        Some(item) => item.sort_key.checked_add(1).ok_or_else(|| {
            DatabaseError::internal(
                "user collection item sort key is exhausted",
            )
        })?,
    };

    user_collection_item_entity::Entity::insert(
        user_collection_item_entity::ActiveModel {
            id: NotSet,
            user_collection_id: Set(collection_id),
            entity_id: Set(Some(req.entity_id)),
            entity_type: Set(req.entity_type.into()),
            description: Set(req.description.clone()),
            sort_key: Set(sort_key),
        },
    )
    .exec_with_returning(conn)
    .await
    .db_operation("insert user collection item")
    .map_err(Into::into)
}

pub(super) async fn delete_user_collection_item(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    item_id: i32,
) -> Result<(), Error> {
    let item = user_collection_item_entity::Entity::find_by_id(item_id)
        .filter(
            user_collection_item_entity::Column::UserCollectionId
                .eq(collection_id),
        )
        .one(conn)
        .await
        .db_operation("find user collection item before delete")?
        .ok_or(Error::NotFound(NotFound::CollectionItem))?;

    user_collection_item_entity::Entity::delete_by_id(item.id)
        .exec(conn)
        .await
        .db_operation("delete user collection item")?;
    Ok(())
}

pub(super) async fn load_user_collection_items(
    conn: &impl ConnectionTrait,
    collection_id: i32,
) -> Result<Vec<user_collection_item_entity::Model>, Error> {
    user_collection_item_entity::Entity::find()
        .filter(
            user_collection_item_entity::Column::UserCollectionId
                .eq(collection_id),
        )
        .order_by_asc(user_collection_item_entity::Column::SortKey)
        .order_by_asc(user_collection_item_entity::Column::Id)
        .all(conn)
        .await
        .db_operation("load user collection items")
        .map_err(Into::into)
}

pub(super) async fn update_user_collection_item_order(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    item_ids: &[i32],
) -> Result<(), Error> {
    let mut ordered_items = item_ids.iter().copied().enumerate();
    let Some((_, first_item_id)) = ordered_items.next() else {
        return Ok(());
    };

    let mut sort_key_expr = Expr::case(
        Expr::col(user_collection_item_entity::Column::Id).eq(first_item_id),
        0,
    );

    for (sort_key, item_id) in ordered_items {
        let sort_key = i32::try_from(sort_key).map_err(|_| {
            DatabaseError::internal("user collection contains too many items")
        })?;
        sort_key_expr = sort_key_expr.case(
            Expr::col(user_collection_item_entity::Column::Id).eq(item_id),
            sort_key,
        );
    }

    user_collection_item_entity::Entity::update_many()
        .filter(all![
            user_collection_item_entity::Column::UserCollectionId
                .eq(collection_id),
            user_collection_item_entity::Column::Id
                .is_in(item_ids.iter().copied()),
        ])
        .col_expr(
            user_collection_item_entity::Column::SortKey,
            sort_key_expr
                .finally(Expr::col(
                    user_collection_item_entity::Column::SortKey,
                ))
                .into(),
        )
        .exec(conn)
        .await
        .db_operation("update user collection item order")?;
    Ok(())
}

async fn load_artist_summaries(
    ids: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<HashMap<i32, ArtistSummary>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    let artists = artist_entity::Entity::find()
        .filter(artist_entity::Column::Id.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection artist summaries")?;

    let profile_images = artist_image_entity::Entity::find()
        .find_also_related(image_entity::Entity)
        .filter(all![
            artist_image_entity::Column::ArtistId.is_in(ids.iter().copied()),
            artist_image_entity::Column::Type.eq(ArtistImageType::Profile),
        ])
        .order_by_desc(image_entity::Column::UploadedAt)
        .all(conn)
        .await
        .db_operation("load user collection artist profile images")?;

    let mut image_map: HashMap<i32, String> = HashMap::new();
    for (ai, img) in profile_images {
        if let Some(img) = img {
            image_map.entry(ai.artist_id).or_insert_with(|| {
                DomainImage::format_url(
                    img.backend,
                    &img.directory,
                    &img.filename,
                )
            });
        }
    }

    Ok(artists
        .into_iter()
        .map(|a| {
            let profile_image_url = image_map.remove(&a.id);
            (
                a.id,
                ArtistSummary {
                    id: a.id,
                    name: a.name,
                    artist_type: a.artist_type,
                    profile_image_url,
                },
            )
        })
        .collect())
}

async fn load_release_summaries(
    ids: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<HashMap<i32, ReleaseSummary>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    let releases = release_entity::Entity::find()
        .filter(release_entity::Column::Id.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection release summaries")?;

    let artists_per_release = releases
        .load_many_to_many(
            artist_entity::Entity,
            release_artist_entity::Entity,
            conn,
        )
        .await
        .db_operation("load user collection release artists")?;

    let cover_images = release_image_entity::Entity::find()
        .find_also_related(image_entity::Entity)
        .filter(all![
            release_image_entity::Column::ReleaseId.is_in(ids.iter().copied()),
            release_image_entity::Column::Type.eq(ReleaseImageType::Cover),
        ])
        .order_by_desc(image_entity::Column::UploadedAt)
        .all(conn)
        .await
        .db_operation("load user collection release cover images")?;

    let mut cover_map: HashMap<i32, String> = HashMap::new();
    for (ri, img) in cover_images {
        if let Some(img) = img {
            cover_map.entry(ri.release_id).or_insert_with(|| {
                DomainImage::format_url(
                    img.backend,
                    &img.directory,
                    &img.filename,
                )
            });
        }
    }

    Ok(releases
        .into_iter()
        .zip(artists_per_release)
        .map(|(r, artists)| {
            let release_date = DateWithPrecision::from_option(
                r.release_date,
                r.release_date_precision,
            );
            let cover_art_url = cover_map.remove(&r.id);
            let artists = artists
                .into_iter()
                .map(|a| SimpleArtist {
                    id: a.id,
                    name: a.name,
                })
                .collect();
            (
                r.id,
                ReleaseSummary {
                    id: r.id,
                    title: r.title,
                    release_type: r.release_type,
                    release_date,
                    cover_art_url,
                    artists,
                },
            )
        })
        .collect())
}

async fn load_song_summaries(
    ids: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<HashMap<i32, SongSummary>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    let songs = song_entity::Entity::find()
        .filter(song_entity::Column::Id.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection song summaries")?;

    let song_artists_per_song = songs
        .load_many_to_many(
            artist_entity::Entity,
            song_artist_entity::Entity,
            conn,
        )
        .await
        .db_operation("load user collection song artists")?;

    // Find the first (smallest) release_id per song via release_track
    let release_tracks = release_track_entity::Entity::find()
        .filter(release_track_entity::Column::SongId.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection song release tracks")?;

    let mut first_release_per_song: HashMap<i32, i32> = HashMap::new();
    for track in &release_tracks {
        first_release_per_song
            .entry(track.song_id)
            .and_modify(|r| *r = (*r).min(track.release_id))
            .or_insert(track.release_id);
    }

    let first_release_ids: Vec<i32> = first_release_per_song
        .values()
        .copied()
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let cover_images = if first_release_ids.is_empty() {
        vec![]
    } else {
        release_image_entity::Entity::find()
            .find_also_related(image_entity::Entity)
            .filter(all![
                release_image_entity::Column::ReleaseId
                    .is_in(first_release_ids),
                release_image_entity::Column::Type.eq(ReleaseImageType::Cover),
            ])
            .order_by_desc(image_entity::Column::UploadedAt)
            .all(conn)
            .await
            .db_operation("load user collection song cover images")?
    };

    let mut release_cover_map: HashMap<i32, String> = HashMap::new();
    for (ri, img) in cover_images {
        if let Some(img) = img {
            release_cover_map.entry(ri.release_id).or_insert_with(|| {
                DomainImage::format_url(
                    img.backend,
                    &img.directory,
                    &img.filename,
                )
            });
        }
    }

    Ok(songs
        .into_iter()
        .zip(song_artists_per_song)
        .map(|(song, song_artists)| {
            let cover_art_url = first_release_per_song
                .get(&song.id)
                .and_then(|release_id| release_cover_map.get(release_id))
                .cloned();
            let artists = song_artists
                .into_iter()
                .map(|a| SimpleArtist {
                    id: a.id,
                    name: a.name,
                })
                .collect();
            (
                song.id,
                SongSummary {
                    id: song.id,
                    title: song.title,
                    artists,
                    cover_art_url,
                },
            )
        })
        .collect())
}

async fn load_tag_summaries(
    ids: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<HashMap<i32, TagSummary>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    Ok(tag_entity::Entity::find()
        .filter(tag_entity::Column::Id.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection tag summaries")?
        .into_iter()
        .map(|t| {
            (
                t.id,
                TagSummary {
                    id: t.id,
                    name: t.name,
                    tag_type: t.r#type,
                },
            )
        })
        .collect())
}

async fn load_event_summaries(
    ids: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<HashMap<i32, EventSummary>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    Ok(event_entity::Entity::find()
        .filter(event_entity::Column::Id.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection event summaries")?
        .into_iter()
        .map(|e| {
            let start_date = DateWithPrecision::from_option(
                e.start_date,
                e.start_date_precision,
            );
            (
                e.id,
                EventSummary {
                    id: e.id,
                    name: e.name,
                    start_date,
                },
            )
        })
        .collect())
}

async fn load_label_summaries(
    ids: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<HashMap<i32, LabelSummary>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    Ok(label_entity::Entity::find()
        .filter(label_entity::Column::Id.is_in(ids.iter().copied()))
        .all(conn)
        .await
        .db_operation("load user collection label summaries")?
        .into_iter()
        .map(|l| {
            (
                l.id,
                LabelSummary {
                    id: l.id,
                    name: l.name,
                },
            )
        })
        .collect())
}
