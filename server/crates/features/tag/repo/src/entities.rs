use entity::{
    artist, artist_tag_vote, entity_popularity, release, release_tag_vote,
    release_track, song, song_tag_vote,
};
use popularity_core::PopularityEntityKind;
use sea_orm::{
    ActiveEnum, ColumnTrait, EntityName, EntityTrait, Order, QueryFilter,
    QueryOrder, QuerySelect, QueryTrait, Select,
};
use sea_query::{Expr, Func, JoinType, NullOrdering, Query, SimpleExpr};
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Clone, Copy, Debug, Default, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TagEntitySort {
    #[default]
    Popular,
    ReleaseDate,
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

pub fn artists_select(tag_id: i32) -> Select<artist::Entity> {
    let entity_ids = artist_tag_vote::Entity::find()
        .select_only()
        .column(artist_tag_vote::Column::ArtistId)
        .filter(artist_tag_vote::Column::TagId.eq(tag_id))
        .filter(artist_tag_vote::Column::Score.gt(0))
        .into_query();

    artist::Entity::find()
        .filter(artist::Column::Id.in_subquery(entity_ids))
        .order_by_with_nulls(
            popularity_score(PopularityEntityKind::Artist),
            Order::Desc,
            NullOrdering::Last,
        )
}

pub fn releases_select(
    tag_id: i32,
    sort: TagEntitySort,
) -> Select<release::Entity> {
    let entity_ids = release_tag_vote::Entity::find()
        .select_only()
        .column(release_tag_vote::Column::ReleaseId)
        .filter(release_tag_vote::Column::TagId.eq(tag_id))
        .filter(release_tag_vote::Column::Score.gt(0))
        .into_query();

    let select = release::Entity::find()
        .filter(release::Column::Id.in_subquery(entity_ids));

    match sort {
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
    }
}

pub fn songs_select(tag_id: i32, sort: TagEntitySort) -> Select<song::Entity> {
    let entity_ids = song_tag_vote::Entity::find()
        .select_only()
        .column(song_tag_vote::Column::SongId)
        .filter(song_tag_vote::Column::TagId.eq(tag_id))
        .filter(song_tag_vote::Column::Score.gt(0))
        .into_query();

    let select =
        song::Entity::find().filter(song::Column::Id.in_subquery(entity_ids));

    match sort {
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
    }
}
