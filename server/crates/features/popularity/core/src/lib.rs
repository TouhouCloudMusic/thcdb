use std::collections::BTreeMap;

use chrono::{Days, Utc};
use entity::{entity_popularity, popularity_snapshot};
use fred::prelude::Pool;
use futures_util::TryFutureExt;
use infra_error::{ContextError, ResultExt};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveEnum, ConnectionTrait, DatabaseConnection, DeriveActiveEnum,
    EntityName, EntityTrait, EnumIter, FromQueryResult, QuerySelect,
    QueryTrait, TransactionTrait,
};
use sea_query::{Alias, Expr, OnConflict, Order, Query, UnionType};
use visit_core::EntityType;

use self::scoring::Metrics;

mod participation;
mod scoring;

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

const RANKING_LIMIT: u64 = 6;

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
struct PopularityEntity {
    kind: PopularityEntityKind,
    id: i32,
}

#[derive(
    Clone,
    Copy,
    Debug,
    Eq,
    Ord,
    PartialEq,
    PartialOrd,
    EnumIter,
    DeriveActiveEnum,
)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum PopularityEntityKind {
    #[sea_orm(string_value = "release")]
    Release,
    #[sea_orm(string_value = "artist")]
    Artist,
    #[sea_orm(string_value = "song")]
    Song,
}

#[derive(Default)]
pub struct Ranking {
    pub release_ids: Vec<i32>,
    pub artist_ids: Vec<i32>,
    pub song_ids: Vec<i32>,
}

pub async fn load_ranking(
    db: &impl ConnectionTrait,
) -> Result<Ranking, ContextError> {
    #[derive(FromQueryResult)]
    struct RankedEntity {
        entity_type: PopularityEntityKind,
        entity_id: i32,
    }

    let entity_popularity_columns = || {
        [
            entity_popularity::Column::EntityType,
            entity_popularity::Column::EntityId,
            entity_popularity::Column::Score,
        ]
    };
    let ranked_alias = Alias::new("ranked");

    let [mut query, artists, songs] = [
        PopularityEntityKind::Release,
        PopularityEntityKind::Artist,
        PopularityEntityKind::Song,
    ]
    .map(|kind| {
        let ranked = Query::select()
            .columns(entity_popularity_columns())
            .from(entity_popularity::Entity.table_ref())
            .and_where(
                Expr::col(entity_popularity::Column::EntityType)
                    .eq(kind.to_value()),
            )
            .order_by(entity_popularity::Column::Score, Order::Desc)
            .order_by(entity_popularity::Column::EntityId, Order::Asc)
            .limit(RANKING_LIMIT)
            .to_owned();

        Query::select()
            .columns(entity_popularity_columns())
            .from_subquery(ranked, ranked_alias.clone())
            .to_owned()
    });
    query
        .union(UnionType::All, artists)
        .union(UnionType::All, songs)
        .order_by(Alias::new("score"), Order::Desc)
        .order_by(Alias::new("entity_id"), Order::Asc);

    let rows = RankedEntity::find_by_statement(
        db.get_database_backend().build(&query),
    )
    .all(db)
    .await
    .context("load popularity ranking")?;

    let mut ranking = Ranking::default();

    for RankedEntity {
        entity_type,
        entity_id,
    } in rows
    {
        match entity_type {
            PopularityEntityKind::Release => {
                ranking.release_ids.push(entity_id);
            }
            PopularityEntityKind::Artist => ranking.artist_ids.push(entity_id),
            PopularityEntityKind::Song => ranking.song_ids.push(entity_id),
        }
    }

    Ok(ranking)
}

pub async fn initialize_scores(
    db: &DatabaseConnection,
    redis: &Pool,
) -> Result<(), ContextError> {
    let query = popularity_snapshot::Entity::find()
        .select_only()
        .column(popularity_snapshot::Column::CalculatedAt)
        .into_query();

    if db
        .query_one(db.get_database_backend().build(&query))
        .await
        .context("load popularity snapshot")?
        .is_none()
    {
        refresh_scores(db, redis).await?;
    }

    Ok(())
}

pub async fn refresh_scores(
    db: &DatabaseConnection,
    redis: &Pool,
) -> Result<(), ContextError> {
    let now = Utc::now();
    let day = now.date_naive();

    let (visits, participants) = tokio::try_join!(
        visit_core::counts(redis, day)
            .map_err(|source| ContextError::new("load visit counts", source)),
        participation::counts(db, day - Days::new(6), day).map_err(|source| {
            ContextError::new("load popularity participation counts", source)
        }),
    )?;

    let mut metrics = BTreeMap::new();

    for (entity, counts) in participants {
        let entry = metrics.entry(entity).or_insert_with(Metrics::default);

        entry.collector_count = counts.collector_count;
        entry.voter_count = counts.voter_count;
    }

    for visit in visits {
        let kind = match visit.kind {
            EntityType::Release => PopularityEntityKind::Release,
            EntityType::Artist => PopularityEntityKind::Artist,
            EntityType::Song => PopularityEntityKind::Song,
        };

        metrics
            .entry(PopularityEntity { kind, id: visit.id })
            .or_insert_with(Metrics::default)
            .visitors = visit.visitors;
    }

    let mut items = scoring::score_batch(metrics);
    items.retain(|(_, score)| *score > 0.0);

    store_scores(db, &items, now).await
}

async fn store_scores(
    db: &DatabaseConnection,
    items: &[(PopularityEntity, f64)],
    calculated_at: chrono::DateTime<Utc>,
) -> Result<(), ContextError> {
    let tx = db.begin().await.context("begin popularity snapshot")?;

    entity_popularity::Entity::delete_many()
        .exec(&tx)
        .await
        .context("clear popularity scores")?;

    for chunk in items.chunks(1000) {
        let rows = chunk.iter().map(|(entity, score)| {
            entity_popularity::ActiveModel {
                entity_type: Set(entity.kind.to_value()),
                entity_id: Set(entity.id),
                score: Set(*score),
            }
        });

        entity_popularity::Entity::insert_many(rows)
            .exec_without_returning(&tx)
            .await
            .context("store popularity scores")?;
    }

    popularity_snapshot::Entity::insert(popularity_snapshot::ActiveModel {
        id: Set(1),
        calculated_at: Set(calculated_at.into()),
    })
    .on_conflict(
        OnConflict::column(popularity_snapshot::Column::Id)
            .update_column(popularity_snapshot::Column::CalculatedAt)
            .to_owned(),
    )
    .exec_without_returning(&tx)
    .await
    .context("store popularity snapshot")?;

    tx.commit().await.context("commit popularity snapshot")
}
