use std::collections::{HashMap, HashSet};

use domain::shared::PageResponse;
use entity::tag::Column::Name;
use entity::{
    artist, artist_tag_vote, entity_popularity, release, release_tag_vote,
    release_track, song, song_tag_vote, tag, tag_alternative_name,
    tag_relation,
};
use infra_db::SeaOrmRepository;
use popularity_core::PopularityEntityKind;
use sea_orm::{
    ActiveEnum, ColumnTrait, ConnectionTrait, EntityName, EntityTrait,
    LoaderTrait, Order, QueryFilter, QueryOrder, QuerySelect, QueryTrait,
};
use sea_query::extension::postgres::PgBinOper::{
    Similarity, SimilarityDistance,
};
use sea_query::{
    Expr, ExprTrait, Func, JoinType, NullOrdering, Query, SimpleExpr,
};
use serde::Serialize;
use utoipa::ToSchema;

use super::filter::TagEntitySort;
use crate::features::artist::list::{self as artist_list, ArtistListItem};
use crate::features::release::list::{self as release_list, ReleaseListItem};
use crate::features::song::list::{self as song_list, SongListItem};
use crate::features::tag::list::{self, TagListItem};
use crate::features::tag::model::{AlternativeName, Tag, TagRef, TagRelation};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

#[derive(Serialize, ToSchema)]
#[serde(tag = "entity_type", content = "page", rename_all = "snake_case")]
pub(super) enum TagEntitiesPage {
    Release(PageResponse<ReleaseListItem>),
    Song(PageResponse<SongListItem>),
    Artist(PageResponse<ArtistListItem>),
}

fn popularity_score(kind: PopularityEntityKind) -> SimpleExpr {
    let entity_id = match kind {
        PopularityEntityKind::Release => {
            Expr::col((release::Entity, release::Column::Id))
        }
        PopularityEntityKind::Artist => {
            Expr::col((artist::Entity, artist::Column::Id))
        }
        PopularityEntityKind::Song => {
            Expr::col((song::Entity, song::Column::Id))
        }
    };

    let query = Query::select()
        .expr(Expr::col(entity_popularity::Column::Score))
        .from(entity_popularity::Entity.table_ref())
        .and_where(
            Expr::col(entity_popularity::Column::EntityType)
                .eq(kind.to_value()),
        )
        .and_where(Expr::col(entity_popularity::Column::EntityId).eq(entity_id))
        .to_owned();

    SimpleExpr::SubQuery(None, Box::new(query.into_sub_query_statement()))
}

fn earliest_release_date() -> SimpleExpr {
    let query = Query::select()
        .expr(Func::min(Expr::col((
            release::Entity,
            release::Column::ReleaseDate,
        ))))
        .from(release_track::Entity)
        .join(
            JoinType::InnerJoin,
            release::Entity,
            Expr::col((
                release_track::Entity,
                release_track::Column::ReleaseId,
            ))
            .equals((release::Entity, release::Column::Id)),
        )
        .and_where(
            Expr::col((release_track::Entity, release_track::Column::SongId))
                .equals((song::Entity, song::Column::Id)),
        )
        .to_owned();

    SimpleExpr::SubQuery(None, Box::new(query.into_sub_query_statement()))
}

pub(super) async fn find_artists(
    repo: &SeaOrmRepository,
    tag_id: i32,
    pagination: crate::shared::http::PageQuery,
) -> Result<PageResponse<ArtistListItem>, DatabaseError> {
    let entity_ids = artist_tag_vote::Entity::find()
        .select_only()
        .column(artist_tag_vote::Column::ArtistId)
        .filter(artist_tag_vote::Column::TagId.eq(tag_id))
        .filter(artist_tag_vote::Column::Score.gt(0))
        .into_query();

    utils::find_many_page(
        &repo.conn,
        artist::Entity::find()
            .filter(artist::Column::Id.in_subquery(entity_ids))
            .order_by_with_nulls(
                popularity_score(PopularityEntityKind::Artist),
                Order::Desc,
                NullOrdering::Last,
            ),
        pagination,
        artist::Column::Id,
        |select| artist_list::load(select, &repo.conn),
    )
    .await
    .db_operation("find artists by tag")
}

pub(super) async fn find_releases(
    repo: &SeaOrmRepository,
    tag_id: i32,
    sort: TagEntitySort,
    pagination: crate::shared::http::PageQuery,
) -> Result<PageResponse<ReleaseListItem>, DatabaseError> {
    let entity_ids = release_tag_vote::Entity::find()
        .select_only()
        .column(release_tag_vote::Column::ReleaseId)
        .filter(release_tag_vote::Column::TagId.eq(tag_id))
        .filter(release_tag_vote::Column::Score.gt(0))
        .into_query();

    let select = release::Entity::find()
        .filter(release::Column::Id.in_subquery(entity_ids));

    let select = match sort {
        TagEntitySort::Popular => select.order_by_with_nulls(
            popularity_score(PopularityEntityKind::Release),
            Order::Desc,
            NullOrdering::Last,
        ),
        TagEntitySort::ReleaseDate => select.order_by_with_nulls(
            release::Column::ReleaseDate,
            Order::Desc,
            NullOrdering::Last,
        ),
    };

    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        release::Column::Id,
        |select| release_list::load(select, &repo.conn),
    )
    .await
    .db_operation("find releases by tag")
}

pub(super) async fn find_songs(
    repo: &SeaOrmRepository,
    tag_id: i32,
    sort: TagEntitySort,
    pagination: crate::shared::http::PageQuery,
) -> Result<PageResponse<SongListItem>, DatabaseError> {
    let entity_ids = song_tag_vote::Entity::find()
        .select_only()
        .column(song_tag_vote::Column::SongId)
        .filter(song_tag_vote::Column::TagId.eq(tag_id))
        .filter(song_tag_vote::Column::Score.gt(0))
        .into_query();

    let select =
        song::Entity::find().filter(song::Column::Id.in_subquery(entity_ids));

    let select = match sort {
        TagEntitySort::Popular => select.order_by_with_nulls(
            popularity_score(PopularityEntityKind::Song),
            Order::Desc,
            NullOrdering::Last,
        ),
        TagEntitySort::ReleaseDate => select.order_by_with_nulls(
            earliest_release_date(),
            Order::Desc,
            NullOrdering::Last,
        ),
    };

    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        song::Column::Id,
        |select| song_list::load(select, &repo.conn),
    )
    .await
    .db_operation("find songs by tag")
}

pub(super) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Tag>, DatabaseError> {
    let select = tag::Entity::find().filter(tag::Column::Id.eq(id));

    find_many_impl(select, &repo.conn)
        .await
        .map(|mut tags| tags.pop())
        .db_operation("find tag by id")
}

pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Tag>, DatabaseError> {
    let search_term = Func::lower(keyword);

    let select = tag::Entity::find()
        .filter(
            Func::lower(Name.into_expr())
                .binary(Similarity, search_term.clone()),
        )
        .order_by_asc(
            Func::lower(Name.into_expr())
                .binary(SimilarityDistance, search_term),
        );

    find_many_impl(select, &repo.conn)
        .await
        .db_operation("find tags by keyword")
}

pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::TagFilter,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<TagListItem>, DatabaseError> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await
        .db_operation("explore tags");
    }

    let select = filter.into_select();
    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        tag::Column::Id,
        |select| list::load(select, &repo.conn),
    )
    .await
    .db_operation("explore tags")
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::TagFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<TagListItem>, DatabaseError> {
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Tag,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await
        .db_operation("list correction-sorted tag ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let mut select =
        tag::Entity::find().filter(tag::Column::Id.is_in(entity_ids.clone()));

    if let Some(tag_types) = filter.tag_types {
        select = select.filter(tag::Column::Type.is_in(tag_types));
    }

    let mut tags = list::load(select, &repo.conn).await?;

    tags = crate::infra::database::utils::sort_by_id_list(
        tags,
        &entity_ids,
        |tag| tag.id,
    );

    Ok(utils::page_from_items(tags, &pagination))
}

async fn find_many_impl(
    select: sea_orm::Select<tag::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Tag>, DatabaseError> {
    let tags = select.all(db).await.db_operation("load tags")?;
    let alt_names = tags
        .load_many(tag_alternative_name::Entity, db)
        .await
        .db_operation("load tag alternative names")?;
    let tag_relations = load_tag_relations(&tags, db).await?;

    Ok(itertools::izip!(tags, alt_names, tag_relations)
        .map(|(tag, alt_names, relations)| Tag {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
            short_description: tag.short_description,
            description: tag.description,
            alt_names: alt_names
                .into_iter()
                .map(|m| AlternativeName {
                    id: m.id,
                    name: m.name,
                })
                .collect(),
            relations,
        })
        .collect())
}

async fn load_tag_relations(
    tags: &[tag::Model],
    db: &impl ConnectionTrait,
) -> Result<Vec<Vec<TagRelation>>, DatabaseError> {
    let relations = tag_relation::Entity::find()
        .filter(
            tag_relation::Column::TagId.is_in(tags.iter().map(|tag| tag.id)),
        )
        .all(db)
        .await
        .db_operation("load tag relations")?;

    let mut grouped_relations: HashMap<i32, Vec<tag_relation::Model>> =
        HashMap::new();

    for relation in relations {
        grouped_relations
            .entry(relation.tag_id)
            .or_default()
            .push(relation);
    }

    let relation_models = tags
        .iter()
        .map(|tag| grouped_relations.remove(&tag.id).unwrap_or_default())
        .collect::<Vec<_>>();

    let tag_ids = tags.iter().map(|tag| tag.id).collect::<HashSet<_>>();

    let missing_related_tag_ids = relation_models
        .iter()
        .flat_map(|relations| {
            relations.iter().map(|relation| relation.related_tag_id)
        })
        .filter(|id| !tag_ids.contains(id))
        .collect::<HashSet<_>>();

    let related_tags = if missing_related_tag_ids.is_empty() {
        Vec::new()
    } else {
        tag::Entity::find()
            .filter(tag::Column::Id.is_in(missing_related_tag_ids))
            .all(db)
            .await
            .db_operation("load related tags")?
    };

    let mut tag_lookup: HashMap<i32, TagRef> =
        HashMap::with_capacity(tags.len() + related_tags.len());

    for tag in tags {
        tag_lookup.insert(
            tag.id,
            TagRef {
                id: tag.id,
                name: tag.name.clone(),
                r#type: tag.r#type,
            },
        );
    }

    for tag in related_tags {
        tag_lookup.entry(tag.id).or_insert(TagRef {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
        });
    }

    Ok(relation_models
        .into_iter()
        .map(|relations| {
            relations
                .into_iter()
                .filter_map(|relation| {
                    tag_lookup.get(&relation.related_tag_id).cloned().map(
                        |tag| TagRelation {
                            tag,
                            r#type: relation.r#type,
                        },
                    )
                })
                .collect()
        })
        .collect())
}
