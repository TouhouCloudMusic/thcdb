use std::collections::HashMap;

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
    user_collection_item as user_collection_item_entity,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, Order, Query, SelectStatement};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    FromQueryResult, IntoActiveModel, LoaderTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, QueryTrait, Select,
};

use super::error::{Error, NotFound};
use super::model::{
    ArtistSummary, CreateUserCollectionItemRequest, EntitySummary,
    EventSummary, LabelSummary, ReleaseSummary, SongSummary, TagSummary,
    UserCollection, UserCollectionItem, UserCollectionItemDetail,
    UserCollectionItemEntityType, UserCollectionMutationRequest,
    UserCollectionOwner,
};
use crate::domain::artist::SimpleArtist;
use crate::domain::image::Image as DomainImage;
use crate::domain::shared::{DateWithPrecision, PageResponse};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::PageQuery;

#[derive(Debug, Clone, FromQueryResult)]
struct UserCollectionSummaryRow {
    id: i32,
    user_id: i32,
    name: String,
    description: String,
    is_public: bool,
    owner_id: i32,
    owner_name: String,
    item_count: i64,
}

impl From<UserCollectionSummaryRow> for UserCollection {
    fn from(row: UserCollectionSummaryRow) -> Self {
        Self {
            id: row.id,
            owner: UserCollectionOwner {
                id: row.owner_id,
                name: row.owner_name,
            },
            name: row.name,
            description: row.description,
            is_public: row.is_public,
            item_count: u64::try_from(row.item_count).unwrap_or(u64::MAX),
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
    )
    .await?;

    Ok(page_query.to_response(items, total_items))
}

pub(super) async fn load_user_collection_detail(
    conn: &impl ConnectionTrait,
    collection_id: i32,
) -> Result<UserCollection, Error> {
    load_user_collection_summaries(
        conn,
        user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::Id.eq(collection_id)),
    )
    .await?
    .into_iter()
    .next()
    .ok_or(Error::NotFound(NotFound::Collection))
}

async fn load_user_collection_summaries(
    conn: &impl ConnectionTrait,
    select: Select<user_collection_entity::Entity>,
) -> Result<Vec<UserCollection>, Error> {
    let stmt = conn
        .get_database_backend()
        .build(&build_user_collection_summary_query(select));
    let rows = UserCollectionSummaryRow::find_by_statement(stmt)
        .all(conn)
        .await
        .db_operation("load user collection summaries")?;

    Ok(rows.into_iter().map(Into::into).collect())
}

fn build_user_collection_summary_query(
    select: Select<user_collection_entity::Entity>,
) -> SelectStatement {
    let collections_alias = Alias::new("user_collections");

    Query::select()
        .expr(Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::Id,
        )))
        .expr(Expr::col((
            collections_alias.clone(),
            user_collection_entity::Column::UserId,
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
            Expr::col((
                user_collection_item_entity::Entity,
                user_collection_item_entity::Column::Id,
            ))
            .count(),
            Alias::new("item_count"),
        )
        .from_subquery(select.into_query(), collections_alias.clone())
        .inner_join(
            user_entity::Entity,
            Expr::col((
                collections_alias.clone(),
                user_collection_entity::Column::UserId,
            ))
            .equals((user_entity::Entity, user_entity::Column::Id)),
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
        .group_by_col((
            collections_alias.clone(),
            user_collection_entity::Column::Id,
        ))
        .group_by_col((
            collections_alias.clone(),
            user_collection_entity::Column::UserId,
        ))
        .group_by_col((
            collections_alias.clone(),
            user_collection_entity::Column::Name,
        ))
        .group_by_col((
            collections_alias.clone(),
            user_collection_entity::Column::Description,
        ))
        .group_by_col((
            collections_alias.clone(),
            user_collection_entity::Column::IsPublic,
        ))
        .group_by_col((user_entity::Entity, user_entity::Column::Id))
        .group_by_col((user_entity::Entity, user_entity::Column::Name))
        .order_by(
            (collections_alias, user_collection_entity::Column::Id),
            Order::Desc,
        )
        .to_owned()
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
        .order_by_asc(user_collection_item_entity::Column::Position)
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
                position: item.position,
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

pub(super) async fn lock_owned_user_collection(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    owner_id: i32,
) -> Result<(), Error> {
    let collection = user_collection_entity::Entity::find_by_id(collection_id)
        .filter(user_collection_entity::Column::UserId.eq(owner_id))
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("lock owned user collection")?;

    if collection.is_some() {
        return Ok(());
    }

    // The lock query filtered by owner_id, so a miss could mean either the
    // collection doesn't exist at all or it belongs to a different user. Check which.
    let exists = user_collection_entity::Entity::find_by_id(collection_id)
        .one(conn)
        .await
        .db_operation("check user collection exists after lock miss")?
        .is_some();

    if exists {
        Err(Error::CollectionAccessDenied)
    } else {
        Err(Error::NotFound(NotFound::Collection))
    }
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

pub(super) async fn next_user_collection_item_position(
    conn: &impl ConnectionTrait,
    collection_id: i32,
) -> Result<i32, Error> {
    let position = user_collection_item_entity::Entity::find()
        .filter(
            user_collection_item_entity::Column::UserCollectionId
                .eq(collection_id),
        )
        .order_by_desc(user_collection_item_entity::Column::Position)
        .order_by_desc(user_collection_item_entity::Column::Id)
        .one(conn)
        .await
        .db_operation("find next user collection item position")?
        .map_or(0, |item| item.position.saturating_add(1));

    Ok(position)
}

pub(super) async fn insert_user_collection_item(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    req: &CreateUserCollectionItemRequest,
    position: i32,
) -> Result<user_collection_item_entity::Model, Error> {
    user_collection_item_entity::Entity::insert(
        user_collection_item_entity::ActiveModel {
            id: NotSet,
            user_collection_id: Set(collection_id),
            entity_id: Set(Some(req.entity_id)),
            entity_type: Set(req.entity_type.into()),
            description: Set(req.description.clone()),
            position: Set(position),
        },
    )
    .exec_with_returning(conn)
    .await
    .db_operation("insert user collection item")
    .map_err(Into::into)
}

// Delete and reorder rewrite positions directly to their final values, so the
// surrounding transaction must defer the unique constraint before those bulk
// updates run.
pub(super) async fn defer_user_collection_item_position_constraint(
    conn: &impl ConnectionTrait,
) -> Result<(), Error> {
    conn.execute_unprepared(
        r#"SET CONSTRAINTS "user_collection_item_user_collection_id_position_key" DEFERRED"#,
    )
    .await
    .db_operation("defer user collection item position constraint")?;
    Ok(())
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
        .order_by_asc(user_collection_item_entity::Column::Position)
        .order_by_asc(user_collection_item_entity::Column::Id)
        .all(conn)
        .await
        .db_operation("load user collection items")
        .map_err(Into::into)
}

pub(super) async fn update_user_collection_item_positions(
    conn: &impl ConnectionTrait,
    collection_id: i32,
    positions: &[(i32, i32)],
) -> Result<(), Error> {
    let Some(&(first_item_id, first_position)) = positions.first() else {
        return Ok(());
    };

    let mut position_expr = Expr::case(
        Expr::col(user_collection_item_entity::Column::Id).eq(first_item_id),
        first_position,
    );

    for &(item_id, position) in &positions[1..] {
        position_expr = position_expr.case(
            Expr::col(user_collection_item_entity::Column::Id).eq(item_id),
            position,
        );
    }

    let item_ids: Vec<i32> = positions.iter().map(|(id, _)| *id).collect();

    user_collection_item_entity::Entity::update_many()
        .filter(
            user_collection_item_entity::Column::UserCollectionId
                .eq(collection_id),
        )
        .filter(user_collection_item_entity::Column::Id.is_in(item_ids))
        .col_expr(
            user_collection_item_entity::Column::Position,
            position_expr
                .finally(Expr::col(
                    user_collection_item_entity::Column::Position,
                ))
                .into(),
        )
        .exec(conn)
        .await
        .db_operation("update user collection item positions")?;
    Ok(())
}

// Keep collection item positions contiguous after deletes or other operations that
// can leave gaps like 0, 2, 3. `load_user_collection_items` already returns items in
// display order, so we walk that order from 0 upward and rewrite only the rows
// whose stored position is out of sync.
pub(super) async fn resequence_user_collection_item_positions(
    conn: &impl ConnectionTrait,
    collection_id: i32,
) -> Result<(), Error> {
    let items = load_user_collection_items(conn, collection_id).await?;
    let updates: Vec<(i32, i32)> = (0_i32..)
        .zip(items)
        .filter_map(|(expected, item)| {
            (item.position != expected).then_some((item.id, expected))
        })
        .collect();

    update_user_collection_item_positions(conn, collection_id, &updates).await
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
        .filter(
            artist_image_entity::Column::ArtistId.is_in(ids.iter().copied()),
        )
        .filter(artist_image_entity::Column::Type.eq(ArtistImageType::Profile))
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
        .filter(
            release_image_entity::Column::ReleaseId.is_in(ids.iter().copied()),
        )
        .filter(release_image_entity::Column::Type.eq(ReleaseImageType::Cover))
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
            .filter(
                release_image_entity::Column::ReleaseId
                    .is_in(first_release_ids),
            )
            .filter(
                release_image_entity::Column::Type.eq(ReleaseImageType::Cover),
            )
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
