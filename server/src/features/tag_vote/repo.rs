use std::collections::HashMap;

use sea_orm::{
    ConnectionTrait, DbErr, EntityName, EntityTrait, FromQueryResult,
};
use sea_query::{
    Alias, Expr, ExprTrait, Func, OnConflict, Order, Query, SimpleExpr,
};

use super::Error;
use super::model::{EntityType, Score, TagAggregate, TagAggregateVote};
use crate::domain::shared::CursorResponse;
use crate::infra::database::sea_orm::SeaOrmRepository;

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

pub async fn entity_exists(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
) -> Result<bool, DbErr> {
    let query = Query::select()
        .expr(Expr::val(1))
        .from(Alias::new(entity_type.entity_table_name()))
        .and_where(Expr::col(Alias::new("id")).eq(entity_id))
        .limit(1)
        .to_owned();
    let stmt = repo.conn.get_database_backend().build(&query);

    Ok(repo.conn.query_one(stmt).await?.is_some())
}

pub async fn tag_exists(
    repo: &SeaOrmRepository,
    tag_id: i32,
) -> Result<bool, DbErr> {
    // TODO: use exist after update to sea orm 2.0
    let exists = entity::tag::Entity::find_by_id(tag_id)
        .one(&repo.conn)
        .await?
        .is_some();
    Ok(exists)
}

pub async fn upsert(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    tag_id: i32,
    user_id: i32,
    score: Score,
) -> Result<(), Error> {
    if !entity_exists(repo, entity_type, entity_id).await? {
        return Err(Error::EntityNotFound(
            entity_type.entity_name(),
            entity_id,
        ));
    }
    if !tag_exists(repo, tag_id).await? {
        return Err(Error::TagNotFound(tag_id));
    }

    let entity_id_col = Alias::new(entity_type.entity_id_column());
    let tag_id_col = Alias::new("tag_id");
    let user_id_col = Alias::new("user_id");
    let score_col = Alias::new("score");
    let voted_at_col = Alias::new("voted_at");

    let query = Query::insert()
        .into_table(Alias::new(entity_type.vote_table_name()))
        .columns([
            entity_id_col.clone(),
            tag_id_col.clone(),
            user_id_col.clone(),
            score_col.clone(),
            voted_at_col.clone(),
        ])
        .values_panic([
            entity_id.into(),
            tag_id.into(),
            user_id.into(),
            score.as_i16().into(),
            Expr::current_timestamp().into(),
        ])
        .on_conflict(
            OnConflict::columns([entity_id_col, tag_id_col, user_id_col])
                .update_column(score_col)
                .value(voted_at_col, Expr::current_timestamp())
                .to_owned(),
        )
        .to_owned();
    let stmt = repo.conn.get_database_backend().build(&query);

    repo.conn.execute(stmt).await?;
    Ok(())
}

pub async fn delete(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    tag_id: i32,
    user_id: i32,
) -> Result<(), DbErr> {
    let query = Query::delete()
        .from_table(Alias::new(entity_type.vote_table_name()))
        .and_where(
            Expr::col(Alias::new(entity_type.entity_id_column())).eq(entity_id),
        )
        .and_where(Expr::col(Alias::new("tag_id")).eq(tag_id))
        .and_where(Expr::col(Alias::new("user_id")).eq(user_id))
        .to_owned();
    let stmt = repo.conn.get_database_backend().build(&query);

    repo.conn.execute(stmt).await?;
    Ok(())
}

#[expect(
    clippy::too_many_lines,
    reason = "query assembly and response shaping stay easier to review inline"
)]
pub async fn get_tags(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    user_id: Option<i32>,
    cursor: Option<i32>,
    limit: u32,
) -> Result<CursorResponse<TagAggregate>, DbErr> {
    // TODO: Remove alias after update sea query to 1.0
    let vote_table = Alias::new(entity_type.vote_table_name());
    let entity_id_col = Alias::new(entity_type.entity_id_column());
    let tag_table = Alias::new("tag");
    let score_col = Alias::new("score");
    let tag_id_col = Alias::new("tag_id");
    let user_id_col = Alias::new("user_id");
    let id_col = Alias::new("id");
    let name_col = Alias::new("name");
    let short_description_col = Alias::new("short_description");

    let user_vote_expr: SimpleExpr = user_id.map_or_else(
        || Expr::val(Option::<i16>::None).into(),
        |uid| {
            SimpleExpr::SubQuery(
                None,
                Box::new(
                    Query::select()
                        .column(score_col.clone())
                        .from(vote_table.clone())
                        .and_where(
                            Expr::col(entity_id_col.clone()).eq(entity_id),
                        )
                        .and_where(
                            Expr::col(tag_id_col.clone())
                                .equals((tag_table.clone(), id_col.clone())),
                        )
                        .and_where(Expr::col(user_id_col.clone()).eq(uid))
                        .limit(1)
                        .to_owned()
                        .into_sub_query_statement(),
                ),
            )
        },
    );

    // relevance = SUM(score) / positive_vote_count
    // Only return tags with at least one positive vote
    let score_expr = Expr::col((vote_table.clone(), score_col.clone()));
    let positive_vote_count_expr: SimpleExpr =
        Func::sum(Expr::case(score_expr.clone().gt(0), 1).finally(0)).into();
    let positive_count_filter =
        Expr::expr(positive_vote_count_expr.clone()).gt(0);
    let relevance_expr = Expr::expr(Func::sum(score_expr).cast_as("FLOAT"))
        .div(positive_vote_count_expr.clone());

    let mut query = Query::select()
        .expr_as(
            Expr::col((tag_table.clone(), id_col.clone())),
            TagAggregateRowFieldName::Id,
        )
        .expr_as(
            Expr::col((tag_table.clone(), name_col.clone())),
            TagAggregateRowFieldName::Name,
        )
        .expr_as(
            Expr::col((tag_table.clone(), short_description_col.clone())),
            TagAggregateRowFieldName::ShortDescription,
        )
        .expr_as(Expr::val(1).count(), TagAggregateRowFieldName::Count)
        .expr_as(relevance_expr, TagAggregateRowFieldName::Relevance)
        .expr_as(user_vote_expr, TagAggregateRowFieldName::UserVote)
        .from(vote_table.clone())
        .inner_join(
            tag_table.clone(),
            Expr::col((vote_table.clone(), tag_id_col))
                .equals((tag_table.clone(), id_col.clone())),
        )
        .and_where(Expr::col((vote_table.clone(), entity_id_col)).eq(entity_id))
        .group_by_col((tag_table.clone(), id_col.clone()))
        .group_by_col((tag_table.clone(), name_col.clone()))
        .group_by_col((tag_table.clone(), short_description_col))
        .and_having(positive_count_filter)
        .order_by((tag_table.clone(), id_col.clone()), Order::Asc)
        .limit(u64::from(limit) + 1)
        .to_owned();

    if let Some(cursor) = cursor {
        query = query
            .and_having(Expr::col((tag_table.clone(), id_col)).gt(cursor))
            .to_owned();
    }

    let builder = repo.conn.get_database_backend();
    let stmt = builder.build(&query);

    let mut items = TagAggregateRow::find_by_statement(stmt)
        .all(&repo.conn)
        .await?;

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

async fn load_tag_votes(
    repo: &SeaOrmRepository,
    entity_type: EntityType,
    entity_id: i32,
    tag_ids: Vec<i32>,
) -> Result<HashMap<i32, Vec<TagAggregateVote>>, DbErr> {
    if tag_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let vote_table = Alias::new(entity_type.vote_table_name());
    let entity_id_col = Alias::new(entity_type.entity_id_column());
    let user_table = Alias::new(entity::user::Entity.table_name());
    let tag_id_col = Alias::new("tag_id");
    let user_id_col = Alias::new("user_id");
    let user_name_col = Alias::new("user_name");
    let score_col = Alias::new("score");
    let id_col = Alias::new("id");
    let name_col = Alias::new("name");

    let query = Query::select()
        .expr_as(
            Expr::col((vote_table.clone(), tag_id_col.clone())),
            Alias::new("tag_id"),
        )
        .expr_as(
            Expr::col((user_table.clone(), name_col)),
            user_name_col.clone(),
        )
        .expr_as(
            Expr::col((vote_table.clone(), score_col.clone())),
            score_col.clone(),
        )
        .from(vote_table.clone())
        .inner_join(
            user_table.clone(),
            Expr::col((vote_table.clone(), user_id_col))
                .equals((user_table.clone(), id_col)),
        )
        .and_where(Expr::col((vote_table.clone(), entity_id_col)).eq(entity_id))
        .and_where(
            Expr::col((vote_table.clone(), tag_id_col.clone())).is_in(tag_ids),
        )
        .order_by((vote_table.clone(), tag_id_col), Order::Asc)
        .order_by((vote_table.clone(), score_col), Order::Desc)
        .order_by((user_table, Alias::new("name")), Order::Asc)
        .to_owned();
    let stmt = repo.conn.get_database_backend().build(&query);
    let rows = TagAggregateVoteRow::find_by_statement(stmt)
        .all(&repo.conn)
        .await?;

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
    use super::{delete, get_tags, upsert};
    use crate::features::tag_vote::Error;
    use crate::features::tag_vote::model::{EntityType, Score};
    use crate::infra::database::sea_orm::SeaOrmRepository;
    use crate::infra::integration_test::fixture::{
        MockArtist, MockRelease, MockSong, MockTag, MockUser,
    };
    use crate::infra::integration_test::test_connection;

    #[expect(
        clippy::too_many_lines,
        reason = "integration scenario keeps DB setup serial"
    )]
    #[tokio::test]
    async fn tag_vote_repo_supports_upsert_delete_and_filtering() {
        let conn = test_connection().await;
        let repo = SeaOrmRepository::new(conn.clone());
        let song = MockSong::titled("tag vote song")
            .insert(&conn)
            .await
            .unwrap();
        let artist = MockArtist::named("tag vote artist")
            .insert(&conn)
            .await
            .unwrap();
        let release = MockRelease::titled("tag vote release")
            .insert(&conn)
            .await
            .unwrap();
        let veto_only_song = MockSong::titled("tag vote veto only song")
            .insert(&conn)
            .await
            .unwrap();
        let tag_one = MockTag::named("tag-one").insert(&conn).await.unwrap();
        let tag_two = MockTag::named("tag-two").insert(&conn).await.unwrap();
        let tag_update =
            MockTag::named("tag-update").insert(&conn).await.unwrap();
        let tag_errors =
            MockTag::named("tag-errors").insert(&conn).await.unwrap();
        let tag_veto = MockTag::named("tag-veto").insert(&conn).await.unwrap();
        let user = MockUser::with_label("tag_vote_user")
            .insert(&conn)
            .await
            .unwrap();
        let other_user = MockUser::with_label("tag_vote_other")
            .insert(&conn)
            .await
            .unwrap();

        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag_one.id,
            user.id,
            Score::Medium,
        )
        .await
        .unwrap();
        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag_one.id,
            other_user.id,
            Score::Low,
        )
        .await
        .unwrap();
        upsert(
            &repo,
            EntityType::Song,
            song.id,
            tag_two.id,
            user.id,
            Score::Veto,
        )
        .await
        .unwrap();

        let tags =
            get_tags(&repo, EntityType::Song, song.id, Some(user.id), None, 20)
                .await
                .unwrap();

        assert_eq!(tags.next_cursor, None);
        assert_eq!(tags.items.len(), 1);
        assert_eq!(tags.items[0].id, tag_one.id);
        assert_eq!(tags.items[0].short_description, tag_one.short_description);
        assert_eq!(tags.items[0].count, 2);
        assert!((tags.items[0].relevance - 1.5).abs() < f64::EPSILON);
        assert_eq!(tags.items[0].user_vote, Some(2));
        assert_eq!(tags.items[0].votes.len(), 2);
        assert_eq!(tags.items[0].votes[0].user_name, user.name);
        assert_eq!(tags.items[0].votes[0].score, Score::Medium as i16);
        assert_eq!(tags.items[0].votes[1].user_name, other_user.name);
        assert_eq!(tags.items[0].votes[1].score, Score::Low as i16);

        upsert(
            &repo,
            EntityType::Artist,
            artist.id,
            tag_update.id,
            user.id,
            Score::Low,
        )
        .await
        .unwrap();
        upsert(
            &repo,
            EntityType::Artist,
            artist.id,
            tag_update.id,
            other_user.id,
            Score::High,
        )
        .await
        .unwrap();
        upsert(
            &repo,
            EntityType::Artist,
            artist.id,
            tag_update.id,
            user.id,
            Score::High,
        )
        .await
        .unwrap();

        let before_delete = get_tags(
            &repo,
            EntityType::Artist,
            artist.id,
            Some(user.id),
            None,
            20,
        )
        .await
        .unwrap();
        assert_eq!(before_delete.items.len(), 1);
        assert_eq!(before_delete.items[0].count, 2);
        assert!((before_delete.items[0].relevance - 3.0).abs() < f64::EPSILON);
        assert_eq!(before_delete.items[0].user_vote, Some(3));
        assert_eq!(before_delete.items[0].votes.len(), 2);

        delete(&repo, EntityType::Artist, artist.id, tag_update.id, user.id)
            .await
            .unwrap();

        let after_delete = get_tags(
            &repo,
            EntityType::Artist,
            artist.id,
            Some(user.id),
            None,
            20,
        )
        .await
        .unwrap();
        assert_eq!(after_delete.items.len(), 1);
        assert_eq!(after_delete.items[0].count, 1);
        assert!((after_delete.items[0].relevance - 3.0).abs() < f64::EPSILON);
        assert_eq!(after_delete.items[0].user_vote, None);
        assert_eq!(after_delete.items[0].votes.len(), 1);
        assert_eq!(after_delete.items[0].votes[0].user_name, other_user.name);
        assert_eq!(after_delete.items[0].votes[0].score, Score::High as i16);

        upsert(
            &repo,
            EntityType::Release,
            release.id,
            tag_update.id,
            user.id,
            Score::High,
        )
        .await
        .unwrap();
        delete(
            &repo,
            EntityType::Release,
            release.id,
            tag_update.id,
            user.id,
        )
        .await
        .unwrap();

        let release_tags = get_tags(
            &repo,
            EntityType::Release,
            release.id,
            Some(user.id),
            None,
            20,
        )
        .await
        .unwrap();
        assert!(release_tags.items.is_empty());

        let missing_entity = upsert(
            &repo,
            EntityType::Song,
            i32::MAX,
            tag_errors.id,
            user.id,
            Score::Low,
        )
        .await
        .unwrap_err();
        assert!(matches!(
            missing_entity,
            Error::EntityNotFound("Song", id) if id == i32::MAX
        ));

        let missing_tag = upsert(
            &repo,
            EntityType::Song,
            song.id,
            i32::MAX,
            user.id,
            Score::Low,
        )
        .await
        .unwrap_err();
        assert!(
            matches!(missing_tag, Error::TagNotFound(id) if id == i32::MAX)
        );

        upsert(
            &repo,
            EntityType::Song,
            veto_only_song.id,
            tag_veto.id,
            user.id,
            Score::Veto,
        )
        .await
        .unwrap();

        let tags = get_tags(
            &repo,
            EntityType::Song,
            veto_only_song.id,
            Some(user.id),
            None,
            20,
        )
        .await
        .unwrap();

        assert!(tags.items.is_empty());
    }
}
