use std::collections::BTreeMap;

use chrono::{DateTime, NaiveDate, Utc};
use entity::enums::EntityType;
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

fn collector_counts_query(
    entity_type: EntityType,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
) -> SelectStatement {
    let item_table = Alias::new("user_collection_item");
    let item_alias = Alias::new("i");
    let collection_table = Alias::new("user_collection");
    let collection_alias = Alias::new("c");

    let id_col = Alias::new("id");
    let entity_id_col = Alias::new("entity_id");
    let entity_type_col = Alias::new("entity_type");
    let user_id_col = Alias::new("user_id");
    let collection_id_col = Alias::new("user_collection_id");
    let added_at_col = Alias::new("added_at");
    let is_public_col = Alias::new("is_public");
    let count_alias = Alias::new("count");

    Query::select()
        .column((item_alias.clone(), entity_id_col.clone()))
        .expr_as(
            Expr::col((collection_alias.clone(), user_id_col)).count_distinct(),
            count_alias,
        )
        .from_as(item_table, item_alias.clone())
        .join_as(
            JoinType::InnerJoin,
            collection_table,
            collection_alias.clone(),
            Expr::col((item_alias.clone(), collection_id_col))
                .equals((collection_alias.clone(), id_col)),
        )
        .and_where(
            Expr::col((item_alias.clone(), entity_type_col))
                .eq(Expr::val(entity_type.to_value())
                    .as_enum(EntityType::name())),
        )
        .and_where(
            Expr::col((item_alias.clone(), entity_id_col.clone()))
                .is_not_null(),
        )
        .and_where(
            Expr::col((item_alias.clone(), added_at_col.clone())).gte(since),
        )
        .and_where(Expr::col((item_alias.clone(), added_at_col)).lt(until))
        .and_where(Expr::col((collection_alias, is_public_col)).eq(true))
        .group_by_col((item_alias, entity_id_col))
        .to_owned()
}

fn voter_counts_query(
    table_name: &str,
    entity_id_column: &str,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
) -> SelectStatement {
    let vote_table = Alias::new(table_name);
    let entity_id_col = Alias::new(entity_id_column);
    let user_id_col = Alias::new("user_id");
    let voted_at_col = Alias::new("voted_at");

    let entity_id_alias = Alias::new("entity_id");
    let count_alias = Alias::new("count");

    Query::select()
        .expr_as(
            Expr::col((vote_table.clone(), entity_id_col.clone())),
            entity_id_alias,
        )
        .expr_as(
            Expr::col((vote_table.clone(), user_id_col)).count_distinct(),
            count_alias,
        )
        .from(vote_table.clone())
        .and_where(
            Expr::col((vote_table.clone(), voted_at_col.clone())).gte(since),
        )
        .and_where(Expr::col((vote_table.clone(), voted_at_col)).lt(until))
        .group_by_col((vote_table, entity_id_col))
        .to_owned()
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

    for (entity_type, popular_type, vote_table_name, vote_entity_id_column) in [
        (
            EntityType::Release,
            PopularityEntityKind::Release,
            "release_tag_vote",
            "release_id",
        ),
        (
            EntityType::Artist,
            PopularityEntityKind::Artist,
            "artist_tag_vote",
            "artist_id",
        ),
    ] {
        for (query, metric) in [
            (
                collector_counts_query(entity_type, since, until),
                ParticipationMetric::Collectors,
            ),
            (
                voter_counts_query(
                    vote_table_name,
                    vote_entity_id_column,
                    since,
                    until,
                ),
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

                let entity = match popular_type {
                    PopularityEntityKind::Release => {
                        PopularityEntity::Release(row.entity_id)
                    }
                    PopularityEntityKind::Artist => {
                        PopularityEntity::Artist(row.entity_id)
                    }
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
