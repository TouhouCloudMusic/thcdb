use std::collections::BTreeMap;

use chrono::{DateTime, NaiveDate, Utc};
use entity::enums::EntityType;
use entity::{
    artist_tag_vote, release_tag_vote, song_tag_vote, user_collection,
    user_collection_item,
};
use sea_orm::{ActiveEnum, ConnectionTrait, DbErr, FromQueryResult};
use sea_query::{Alias, Expr, JoinType, Query, SelectStatement};

use super::{PopularityEntity, PopularityEntityKind};

#[derive(Default)]
pub(super) struct ParticipationCounts {
    pub collector_count: u64,
    pub voter_count: u64,
}

#[derive(FromQueryResult)]
struct ParticipationCountRow {
    entity_id: i32,
    count: i64,
}

enum ParticipationMetric {
    Collectors,
    Voters,
}

impl PopularityEntityKind {
    fn entity_type(self) -> EntityType {
        match self {
            Self::Release => EntityType::Release,
            Self::Artist => EntityType::Artist,
            Self::Song => EntityType::Song,
        }
    }
}

fn collector_counts_query(
    kind: PopularityEntityKind,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
) -> SelectStatement {
    let entity_type = kind.entity_type();
    let item = || Alias::new("i");
    let collection = || Alias::new("c");

    Query::select()
        .column((item(), user_collection_item::Column::EntityId))
        .expr_as(
            Expr::col((collection(), user_collection::Column::UserId))
                .count_distinct(),
            Alias::new("count"),
        )
        .from_as(user_collection_item::Entity, item())
        .join_as(
            JoinType::InnerJoin,
            user_collection::Entity,
            collection(),
            Expr::col((item(), user_collection_item::Column::UserCollectionId))
                .equals((collection(), user_collection::Column::Id)),
        )
        .and_where(
            Expr::col((item(), user_collection_item::Column::EntityType))
                .eq(Expr::val(entity_type.to_value())
                    .as_enum(EntityType::name())),
        )
        .and_where(
            Expr::col((item(), user_collection_item::Column::EntityId))
                .is_not_null(),
        )
        .and_where(
            Expr::col((item(), user_collection_item::Column::AddedAt))
                .gte(since),
        )
        .and_where(
            Expr::col((item(), user_collection_item::Column::AddedAt))
                .lt(until),
        )
        .and_where(
            Expr::col((collection(), user_collection::Column::IsPublic))
                .eq(true),
        )
        .group_by_col((item(), user_collection_item::Column::EntityId))
        .to_owned()
}

fn voter_counts_query(
    kind: PopularityEntityKind,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
) -> SelectStatement {
    macro_rules! query {
        ($vote:ident, $entity_id:ident) => {
            Query::select()
                .expr_as(
                    Expr::col(($vote::Entity, $vote::Column::$entity_id)),
                    Alias::new("entity_id"),
                )
                .expr_as(
                    Expr::col(($vote::Entity, $vote::Column::UserId))
                        .count_distinct(),
                    Alias::new("count"),
                )
                .from($vote::Entity)
                .and_where(
                    Expr::col(($vote::Entity, $vote::Column::VotedAt))
                        .gte(since),
                )
                .and_where(
                    Expr::col(($vote::Entity, $vote::Column::VotedAt))
                        .lt(until),
                )
                .group_by_col(($vote::Entity, $vote::Column::$entity_id))
                .to_owned()
        };
    }

    match kind {
        PopularityEntityKind::Release => query!(release_tag_vote, ReleaseId),
        PopularityEntityKind::Artist => query!(artist_tag_vote, ArtistId),
        PopularityEntityKind::Song => query!(song_tag_vote, SongId),
    }
}

pub(super) async fn counts(
    conn: &impl ConnectionTrait,
    since: NaiveDate,
    until: NaiveDate,
) -> Result<BTreeMap<PopularityEntity, ParticipationCounts>, DbErr> {
    let since = since.and_time(chrono::NaiveTime::MIN).and_utc();
    let until = until
        .succ_opt()
        .ok_or_else(|| {
            DbErr::Type("participation date exceeds supported range".into())
        })?
        .and_time(chrono::NaiveTime::MIN)
        .and_utc();

    let mut counts: BTreeMap<PopularityEntity, ParticipationCounts> =
        BTreeMap::new();

    for kind in [
        PopularityEntityKind::Release,
        PopularityEntityKind::Artist,
        PopularityEntityKind::Song,
    ] {
        for (query, metric) in [
            (
                collector_counts_query(kind, since, until),
                ParticipationMetric::Collectors,
            ),
            (
                voter_counts_query(kind, since, until),
                ParticipationMetric::Voters,
            ),
        ] {
            let rows = ParticipationCountRow::find_by_statement(
                conn.get_database_backend().build(&query),
            )
            .all(conn)
            .await?;

            for row in rows {
                let count = u64::try_from(row.count)
                    .map_err(|error| DbErr::Type(error.to_string()))?;

                let entity = PopularityEntity {
                    kind,
                    id: row.entity_id,
                };
                let entry = counts.entry(entity).or_default();

                match metric {
                    ParticipationMetric::Collectors => {
                        entry.collector_count = count;
                    }
                    ParticipationMetric::Voters => {
                        entry.voter_count = count;
                    }
                }
            }
        }
    }

    Ok(counts)
}
