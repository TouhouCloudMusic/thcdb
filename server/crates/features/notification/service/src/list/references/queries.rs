//! Reference queries used to assemble notification list items.

use std::collections::HashMap;

use entity::enums::EntityType;
use entity::{
    artist, correction, credit_role, event, label, release, song, song_lyrics,
    tag, user_collection,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, FromQueryResult, JoinType,
    QueryFilter, QuerySelect,
};
use sea_query::{Alias, Expr, Query, SelectStatement, UnionType};

use super::{EntityNameKind, ReferenceIds, ReferenceKind};

#[derive(FromQueryResult)]
pub(super) struct ReferencedUserCollection {
    pub(super) id: i32,
    pub(super) user_id: i32,
    pub(super) name: String,
    pub(super) is_public: bool,
}

pub(super) async fn load_collections(
    conn: &impl ConnectionTrait,
    ids: impl IntoIterator<Item = i32>,
) -> Result<HashMap<i32, ReferencedUserCollection>, DatabaseError> {
    let mut ids = ids.into_iter().peekable();
    if ids.peek().is_none() {
        return Ok(HashMap::new());
    }

    user_collection::Entity::find()
        .select_only()
        .column(user_collection::Column::Id)
        .column(user_collection::Column::UserId)
        .column(user_collection::Column::Name)
        .column(user_collection::Column::IsPublic)
        .filter(user_collection::Column::Id.is_in(ids))
        .into_model::<ReferencedUserCollection>()
        .all(conn)
        .await
        .db_operation("load notification collections")
        .map(|collections| {
            collections
                .into_iter()
                .map(|collection| (collection.id, collection))
                .collect()
        })
}

#[derive(FromQueryResult)]
pub(super) struct CorrectionTargetReference {
    #[sea_orm(from_alias = "id")]
    pub(super) correction_id: i32,
    pub(super) entity_type: EntityType,
    pub(super) entity_id: i32,
}

pub(super) async fn load_correction_targets(
    conn: &impl ConnectionTrait,
    ids: impl IntoIterator<Item = i32>,
) -> Result<Vec<CorrectionTargetReference>, DatabaseError> {
    let mut ids = ids.into_iter().peekable();
    if ids.peek().is_none() {
        return Ok(Vec::new());
    }

    correction::Entity::find()
        .select_only()
        .column(correction::Column::Id)
        .column(correction::Column::EntityType)
        .column(correction::Column::EntityId)
        .filter(correction::Column::Id.is_in(ids))
        .into_model::<CorrectionTargetReference>()
        .all(conn)
        .await
        .db_operation("load notification correction targets")
}

#[derive(FromQueryResult)]
struct EntityNameRow {
    kind: i16,
    id: i32,
    name: String,
}

#[derive(Default)]
pub(super) struct EntityNames(HashMap<(EntityNameKind, i32), String>);

impl EntityNames {
    fn insert(&mut self, row: EntityNameRow) {
        let kind = match row.kind {
            kind if kind == EntityNameKind::Artist as i16 => {
                EntityNameKind::Artist
            }
            kind if kind == EntityNameKind::Label as i16 => {
                EntityNameKind::Label
            }
            kind if kind == EntityNameKind::Release as i16 => {
                EntityNameKind::Release
            }
            kind if kind == EntityNameKind::Song as i16 => EntityNameKind::Song,
            kind if kind == EntityNameKind::Tag as i16 => EntityNameKind::Tag,
            kind if kind == EntityNameKind::Event as i16 => {
                EntityNameKind::Event
            }
            kind if kind == EntityNameKind::SongLyrics as i16 => {
                EntityNameKind::SongLyrics
            }
            kind if kind == EntityNameKind::CreditRole as i16 => {
                EntityNameKind::CreditRole
            }
            _ => unreachable!("entity name query returned an unknown kind"),
        };
        self.0.insert((kind, row.id), row.name);
    }

    pub(super) fn get(&self, kind: EntityNameKind, id: i32) -> Option<String> {
        self.0.get(&(kind, id)).cloned()
    }
}

fn entity_name_queries(ids: &ReferenceIds) -> Vec<SelectStatement> {
    let mut queries = Vec::new();
    macro_rules! push_names {
        ($kind:expr, $entity:ident, $name_column:expr) => {{
            let mut entity_ids =
                ids.iter(ReferenceKind::Entity($kind)).peekable();
            if entity_ids.peek().is_some() {
                queries.push(
                    Query::select()
                        .expr_as(Expr::value($kind as i16), Alias::new("kind"))
                        .expr_as(
                            Expr::col(($entity::Entity, $entity::Column::Id)),
                            Alias::new("id"),
                        )
                        .expr_as(
                            Expr::col(($entity::Entity, $name_column)),
                            Alias::new("name"),
                        )
                        .from($entity::Entity)
                        .and_where($entity::Column::Id.is_in(entity_ids))
                        .to_owned(),
                );
            }
        }};
    }

    push_names!(EntityNameKind::Artist, artist, artist::Column::Name);
    push_names!(EntityNameKind::Label, label, label::Column::Name);
    push_names!(EntityNameKind::Release, release, release::Column::Title);
    push_names!(EntityNameKind::Song, song, song::Column::Title);
    push_names!(EntityNameKind::Tag, tag, tag::Column::Name);
    push_names!(EntityNameKind::Event, event, event::Column::Name);
    push_names!(
        EntityNameKind::CreditRole,
        credit_role,
        credit_role::Column::Name
    );
    let mut song_lyrics_ids = ids
        .iter(ReferenceKind::Entity(EntityNameKind::SongLyrics))
        .peekable();
    if song_lyrics_ids.peek().is_some() {
        queries.push(
            Query::select()
                .expr_as(
                    Expr::value(EntityNameKind::SongLyrics as i16),
                    Alias::new("kind"),
                )
                .expr_as(
                    Expr::col((song_lyrics::Entity, song_lyrics::Column::Id)),
                    Alias::new("id"),
                )
                .expr_as(
                    Expr::col((song::Entity, song::Column::Title)),
                    Alias::new("name"),
                )
                .from(song_lyrics::Entity)
                .join(
                    JoinType::InnerJoin,
                    song::Entity,
                    Expr::col((
                        song_lyrics::Entity,
                        song_lyrics::Column::SongId,
                    ))
                    .equals((song::Entity, song::Column::Id)),
                )
                .and_where(song_lyrics::Column::Id.is_in(song_lyrics_ids))
                .to_owned(),
        );
    }

    queries
}

pub(super) async fn load_entity_names(
    conn: &impl ConnectionTrait,
    ids: &ReferenceIds,
) -> Result<EntityNames, DatabaseError> {
    let mut queries = entity_name_queries(ids);

    let Some(mut query) = queries.pop() else {
        return Ok(EntityNames::default());
    };
    for next in queries {
        query.union(UnionType::All, next);
    }

    let rows = EntityNameRow::find_by_statement(
        conn.get_database_backend().build(&query),
    )
    .all(conn)
    .await
    .db_operation("load notification entity names")?;
    let mut names = EntityNames::default();
    for row in rows {
        names.insert(row);
    }

    Ok(names)
}
