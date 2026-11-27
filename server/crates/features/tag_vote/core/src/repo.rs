use std::collections::HashMap;

use domain::shared::CursorResponse;
use entity::{artist, release, song, tag, user};
use infra_db::SeaOrmRepository;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use infra_error::EntityNotFound;
use sea_orm::{ConnectionTrait, EntityTrait, FromQueryResult};
use sea_query::{
    Alias, Expr, ExprTrait, Func, OnConflict, Order, Query, SimpleExpr,
};

use super::Error;
use super::model::{EntityType, Score, TagAggregate, TagAggregateVote};

macro_rules! with_vote_entity {
    ($kind:expr, | $vote:ident, $entity_id_col:ident | $query:expr) => {
        match $kind {
            EntityType::Release => {
                use entity::release_tag_vote as $vote;
                let $entity_id_col = $vote::Column::ReleaseId;
                $query
            }
            EntityType::Song => {
                use entity::song_tag_vote as $vote;
                let $entity_id_col = $vote::Column::SongId;
                $query
            }
            EntityType::Artist => {
                use entity::artist_tag_vote as $vote;
                let $entity_id_col = $vote::Column::ArtistId;
                $query
            }
        }
    };
}

#[derive(Debug, Clone, sea_orm::FromQueryResult, macros::FieldEnum)]
struct TagAggregateRow {
    id: i32,
    name: String,
    short_description: String,
    count: i64,
    relevance: f64,
    user_vote: Option<i16>,
}

impl sea_query::Iden for TagAggregateRowFieldName {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        s.write_str(self.as_str()).unwrap();
    }
}

#[fastrace::trace(name = "tag_vote.upsert")]
pub async fn upsert(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    tag_id: i32,
    user_id: i32,
    score: Score,
) -> Result<(), Error> {
    let mut query = Query::select();
    query.expr(Expr::val(1)).limit(1);

    match entity_type {
        EntityType::Release => query
            .from(release::Entity)
            .and_where(Expr::col(release::Column::Id).eq(entity_id)),
        EntityType::Song => query
            .from(song::Entity)
            .and_where(Expr::col(song::Column::Id).eq(entity_id)),
        EntityType::Artist => query
            .from(artist::Entity)
            .and_where(Expr::col(artist::Column::Id).eq(entity_id)),
    };

    let stmt = repo.conn.get_database_backend().build(&query);

    let row = repo
        .conn
        .query_one(stmt)
        .await
        .db_context("check tag vote target")?;
    if row.is_none() {
        return Err(Error::NotFound(EntityNotFound::new(
            entity_type.entity_name(),
            entity_id,
        )));
    }
    let tag = entity::tag::Entity::find_by_id(tag_id)
        .one(&repo.conn)
        .await
        .db_context("check tag vote tag")?;
    if tag.is_none() {
        return Err(Error::NotFound(EntityNotFound::new("Tag", tag_id)));
    }

    let query = with_vote_entity!(entity_type, |vote, entity_id_col| {
        Query::insert()
            .into_table(vote::Entity)
            .columns([
                entity_id_col,
                vote::Column::TagId,
                vote::Column::UserId,
                vote::Column::Score,
                vote::Column::VotedAt,
            ])
            .values_panic([
                entity_id.into(),
                tag_id.into(),
                user_id.into(),
                score.as_i16().into(),
                Expr::current_timestamp().into(),
            ])
            .on_conflict(
                OnConflict::columns([
                    entity_id_col,
                    vote::Column::TagId,
                    vote::Column::UserId,
                ])
                .update_column(vote::Column::Score)
                .value(vote::Column::VotedAt, Expr::current_timestamp())
                .to_owned(),
            )
            .to_owned()
    });
    let stmt = repo.conn.get_database_backend().build(&query);

    repo.conn
        .execute(stmt)
        .await
        .db_context("upsert tag vote")?;
    Ok(())
}

#[infra_db::observe("tag_vote.delete")]
pub async fn delete(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    tag_id: i32,
    user_id: i32,
) -> Result<(), DatabaseError> {
    let query = with_vote_entity!(entity_type, |vote, entity_id_col| {
        Query::delete()
            .from_table(vote::Entity)
            .and_where(Expr::col(entity_id_col).eq(entity_id))
            .and_where(Expr::col(vote::Column::TagId).eq(tag_id))
            .and_where(Expr::col(vote::Column::UserId).eq(user_id))
            .to_owned()
    });
    let stmt = repo.conn.get_database_backend().build(&query);

    repo.conn.execute(stmt).await?;
    Ok(())
}

#[infra_db::observe("tag_vote.get_tags")]
pub async fn get_tags(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    user_id: Option<i32>,
    cursor: Option<i32>,
    limit: u8,
) -> Result<CursorResponse<TagAggregate>, DatabaseError> {
    let query = with_vote_entity!(entity_type, |vote, entity_id_col| {
        let user_vote_expr: SimpleExpr = user_id.map_or_else(
            || Expr::val(Option::<i16>::None).into(),
            |uid| {
                SimpleExpr::SubQuery(
                    None,
                    Box::new(
                        Query::select()
                            .column(vote::Column::Score)
                            .from(vote::Entity)
                            .and_where(Expr::col(entity_id_col).eq(entity_id))
                            .and_where(
                                Expr::col(vote::Column::TagId)
                                    .equals((tag::Entity, tag::Column::Id)),
                            )
                            .and_where(Expr::col(vote::Column::UserId).eq(uid))
                            .limit(1)
                            .to_owned()
                            .into_sub_query_statement(),
                    ),
                )
            },
        );

        // relevance = SUM(score) / positive_vote_count
        // Only return tags with at least one positive vote
        let score_expr = Expr::col((vote::Entity, vote::Column::Score));
        let positive_vote_count_expr: SimpleExpr =
            Func::sum(Expr::case(score_expr.clone().gt(0), 1).finally(0))
                .into();
        let positive_count_filter =
            Expr::expr(positive_vote_count_expr.clone()).gt(0);
        let relevance_expr = Expr::expr(Func::sum(score_expr).cast_as("FLOAT"))
            .div(positive_vote_count_expr);

        let mut query = Query::select()
            .expr_as(
                Expr::col((tag::Entity, tag::Column::Id)),
                TagAggregateRowFieldName::Id,
            )
            .expr_as(
                Expr::col((tag::Entity, tag::Column::Name)),
                TagAggregateRowFieldName::Name,
            )
            .expr_as(
                Expr::col((tag::Entity, tag::Column::ShortDescription)),
                TagAggregateRowFieldName::ShortDescription,
            )
            .expr_as(Expr::val(1).count(), TagAggregateRowFieldName::Count)
            .expr_as(relevance_expr, TagAggregateRowFieldName::Relevance)
            .expr_as(user_vote_expr, TagAggregateRowFieldName::UserVote)
            .from(vote::Entity)
            .inner_join(
                tag::Entity,
                Expr::col((vote::Entity, vote::Column::TagId))
                    .equals((tag::Entity, tag::Column::Id)),
            )
            .and_where(Expr::col((vote::Entity, entity_id_col)).eq(entity_id))
            .group_by_col((tag::Entity, tag::Column::Id))
            .group_by_col((tag::Entity, tag::Column::Name))
            .group_by_col((tag::Entity, tag::Column::ShortDescription))
            .and_having(positive_count_filter)
            .order_by((tag::Entity, tag::Column::Id), Order::Asc)
            .limit(u64::from(limit) + 1)
            .to_owned();

        if let Some(cursor) = cursor {
            query = query
                .and_having(
                    Expr::col((tag::Entity, tag::Column::Id)).gt(cursor),
                )
                .to_owned();
        }

        query
    });

    let builder = repo.conn.get_database_backend();
    let stmt = builder.build(&query);

    let mut items = TagAggregateRow::find_by_statement(stmt)
        .all(&repo.conn)
        .await
        .db_context("load tag vote aggregates")?;

    let next_cursor = if items.len() > limit as usize {
        items.pop();
        items.last().map(|tag| tag.id)
    } else {
        None
    };

    let vote_map = load_tag_votes(
        repo,
        entity_type,
        entity_id,
        items.iter().map(|tag| tag.id).collect(),
    )
    .await?;

    let items = items
        .into_iter()
        .map(|tag| TagAggregate {
            id: tag.id,
            name: tag.name,
            short_description: tag.short_description,
            count: tag.count,
            relevance: tag.relevance,
            user_vote: tag.user_vote,
            votes: vote_map.get(&tag.id).cloned().unwrap_or_default(),
        })
        .collect();

    Ok(CursorResponse { items, next_cursor })
}

#[derive(Debug, Clone, FromQueryResult)]
struct TagAggregateVoteRow {
    tag_id: i32,
    user_name: String,
    score: i16,
}

#[infra_db::observe("tag_vote.load_tag_votes")]
async fn load_tag_votes(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    tag_ids: Vec<i32>,
) -> Result<HashMap<i32, Vec<TagAggregateVote>>, DatabaseError> {
    if tag_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let query = with_vote_entity!(entity_type, |vote, entity_id_col| {
        Query::select()
            .column((vote::Entity, vote::Column::TagId))
            .expr_as(
                Expr::col((user::Entity, user::Column::Name)),
                Alias::new("user_name"),
            )
            .column((vote::Entity, vote::Column::Score))
            .from(vote::Entity)
            .inner_join(
                user::Entity,
                Expr::col((vote::Entity, vote::Column::UserId))
                    .equals((user::Entity, user::Column::Id)),
            )
            .and_where(Expr::col((vote::Entity, entity_id_col)).eq(entity_id))
            .and_where(
                Expr::col((vote::Entity, vote::Column::TagId)).is_in(tag_ids),
            )
            .order_by((vote::Entity, vote::Column::TagId), Order::Asc)
            .order_by((vote::Entity, vote::Column::Score), Order::Desc)
            .order_by((user::Entity, user::Column::Name), Order::Asc)
            .to_owned()
    });
    let stmt = repo.conn.get_database_backend().build(&query);
    let rows = TagAggregateVoteRow::find_by_statement(stmt)
        .all(&repo.conn)
        .await
        .db_context("load tag aggregate votes")?;

    let mut votes = HashMap::<i32, Vec<TagAggregateVote>>::new();
    for row in rows {
        votes.entry(row.tag_id).or_default().push(TagAggregateVote {
            user_name: row.user_name,
            score: row.score,
        });
    }

    Ok(votes)
}

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use entity::{song, tag};
    use infra_db::{DatabaseConnection, SeaOrmRepository};
    use infra_testing::{MockUser, test_connection};
    use sea_orm::ActiveValue::Set;
    use sea_orm::EntityTrait;

    use super::{EntityType, Score, get_tags, upsert};

    async fn insert_song(
        conn: &DatabaseConnection,
        title: &str,
    ) -> anyhow::Result<song::Model> {
        Ok(song::Entity::insert(song::ActiveModel {
            title: Set(title.to_string()),
            ..Default::default()
        })
        .exec_with_returning(conn)
        .await?)
    }

    async fn insert_tag(
        conn: &DatabaseConnection,
        name: &str,
    ) -> anyhow::Result<tag::Model> {
        Ok(tag::Entity::insert(tag::ActiveModel {
            name: Set(name.to_string()),
            r#type: Set(entity::enums::TagType::Genre),
            short_description: Set(format!("{name} short")),
            description: Set(format!("{name} description")),
            ..Default::default()
        })
        .exec_with_returning(conn)
        .await?)
    }

    #[tokio::test]
    async fn aggregates_votes_and_hides_tags_without_positive_votes()
    -> anyhow::Result<()> {
        let conn = test_connection().await;
        let repo = SeaOrmRepository::new(conn.clone());
        let song = insert_song(&conn, "tag vote aggregation song").await?;
        let tag_one = insert_tag(&conn, "tag-vote-positive").await?;
        let tag_veto = insert_tag(&conn, "tag-vote-veto").await?;
        let user = MockUser::with_label("tag_vote_user").insert(&conn).await?;
        let other_user =
            MockUser::with_label("tag_vote_other").insert(&conn).await?;

        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag_one.id,
            user.id,
            Score::Medium,
        )
        .await?;
        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag_one.id,
            other_user.id,
            Score::Low,
        )
        .await?;
        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag_veto.id,
            user.id,
            Score::Veto,
        )
        .await?;

        let tags =
            get_tags(&repo, EntityType::Song, song.id, None, None, 20).await?;

        assert_eq!(tags.items.len(), 1);
        assert_eq!(tags.items[0].id, tag_one.id);
        assert_eq!(tags.items[0].count, 2);
        assert!((tags.items[0].relevance - 1.5).abs() < f64::EPSILON);
        Ok(())
    }

    #[tokio::test]
    async fn voting_again_replaces_the_previous_score() -> anyhow::Result<()> {
        let conn = test_connection().await;
        let repo = SeaOrmRepository::new(conn.clone());
        let song = insert_song(&conn, "tag vote overwrite song").await?;
        let tag = insert_tag(&conn, "tag-vote-overwrite").await?;
        let user = MockUser::with_label("tag_vote_overwrite_user")
            .insert(&conn)
            .await?;

        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag.id,
            user.id,
            Score::Low,
        )
        .await?;
        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag.id,
            user.id,
            Score::High,
        )
        .await?;
        let tags =
            get_tags(&repo, EntityType::Song, song.id, None, None, 20).await?;

        assert_eq!(tags.items.len(), 1);
        assert_eq!(tags.items[0].id, tag.id);
        assert_eq!(tags.items[0].count, 1);
        assert!((tags.items[0].relevance - 3.0).abs() < f64::EPSILON);

        Ok(())
    }
}
