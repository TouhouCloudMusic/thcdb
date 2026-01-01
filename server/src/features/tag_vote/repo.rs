use sea_orm::{ConnectionTrait, DbErr, EntityTrait, FromQueryResult};
use sea_query::{Alias, Expr, Order, Query, SimpleExpr};

use super::Error;
use super::model::{EntityType, Score, TagAggregate, TagAggregateFieldName};
use crate::domain::Connection;
use crate::domain::shared::Paginated;

pub async fn entity_exists<R>(
    repo: &R,
    entity_type: EntityType,
    entity_id: i32,
) -> Result<bool, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    let table_name = entity_type.entity_table_name();
    let sql = format!("SELECT 1 FROM {table_name} WHERE id = $1 LIMIT 1");
    let stmt = sea_orm::Statement::from_sql_and_values(
        repo.conn().get_database_backend(),
        sql,
        [entity_id.into()],
    );

    Ok(repo.conn().query_one(stmt).await?.is_some())
}

pub async fn tag_exists<R>(repo: &R, tag_id: i32) -> Result<bool, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    // TODO: use exist after update to sea orm 2.0
    let exists = entity::tag::Entity::find_by_id(tag_id)
        .one(repo.conn())
        .await?
        .is_some();
    Ok(exists)
}

pub async fn upsert<R>(
    repo: &R,
    entity_type: EntityType,
    entity_id: i32,
    tag_id: i32,
    user_id: i32,
    score: Score,
) -> Result<(), Error>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    if !entity_exists(repo, entity_type, entity_id).await? {
        return Err(Error::EntityNotFound(
            entity_type.entity_name(),
            entity_id,
        ));
    }
    if !tag_exists(repo, tag_id).await? {
        return Err(Error::TagNotFound(tag_id));
    }

    let table_name = entity_type.vote_table_name();
    let entity_id_col = entity_type.entity_id_column();

    let sql = format!(
        r"
        INSERT INTO {table_name} ({entity_id_col}, tag_id, user_id, score, voted_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT ({entity_id_col}, tag_id, user_id)
        DO UPDATE SET score = $4, voted_at = NOW()
        "
    );

    let stmt = sea_orm::Statement::from_sql_and_values(
        repo.conn().get_database_backend(),
        sql,
        [
            entity_id.into(),
            tag_id.into(),
            user_id.into(),
            score.as_i16().into(),
        ],
    );

    repo.conn().execute(stmt).await?;
    Ok(())
}

pub async fn delete<R>(
    repo: &R,
    entity_type: EntityType,
    entity_id: i32,
    tag_id: i32,
    user_id: i32,
) -> Result<(), DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    let table_name = entity_type.vote_table_name();
    let entity_id_col = entity_type.entity_id_column();

    let sql = format!(
        r"
        DELETE FROM {table_name}
        WHERE {entity_id_col} = $1 AND tag_id = $2 AND user_id = $3
        "
    );

    let stmt = sea_orm::Statement::from_sql_and_values(
        repo.conn().get_database_backend(),
        sql,
        [entity_id.into(), tag_id.into(), user_id.into()],
    );

    repo.conn().execute(stmt).await?;
    Ok(())
}

pub async fn get_tags<R>(
    repo: &R,
    entity_type: EntityType,
    entity_id: i32,
    user_id: Option<i32>,
    cursor: Option<i32>,
    limit: u32,
) -> Result<Paginated<TagAggregate>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    // TODO: Remove alias after update sea query to 1.0
    let vote_table = Alias::new(entity_type.vote_table_name());
    let entity_id_col = Alias::new(entity_type.entity_id_column());
    let tag_table = Alias::new("tag");

    let user_vote_expr: SimpleExpr = user_id.map_or_else(
        || Expr::val(Option::<i16>::None).into(),
        |uid| {
            Expr::cust_with_exprs(
                "(SELECT score FROM $1 WHERE $2 = $3 AND tag_id = $4.id AND user_id = $5)",
                [
                    Expr::col(vote_table.clone()).into(),
                    Expr::col(entity_id_col.clone()).into(),
                    Expr::val(entity_id).into(),
                    Expr::col(tag_table.clone()).into(),
                    Expr::val(uid).into(),
                ],
            )
        },
    );

    // relevance = SUM(score) / positive_vote_count
    // Only return tags with at least one positive vote
    let positive_count_filter = Expr::cust_with_exprs(
        "COUNT(*) FILTER (WHERE $1 > 0) > 0",
        [Expr::col((vote_table.clone(), Alias::new("score"))).into()],
    );

    let relevance_expr = Expr::cust_with_exprs(
        "CAST(SUM($1) AS FLOAT) / COUNT(*) FILTER (WHERE $2 > 0)",
        [
            Expr::col((vote_table.clone(), Alias::new("score"))).into(),
            Expr::col((vote_table.clone(), Alias::new("score"))).into(),
        ],
    );

    let mut query = Query::select()
        .expr_as(
            Expr::col((tag_table.clone(), Alias::new("id"))),
            TagAggregateFieldName::Id,
        )
        .expr_as(
            Expr::col((tag_table.clone(), Alias::new("name"))),
            TagAggregateFieldName::Name,
        )
        .expr_as(Expr::cust("COUNT(*)"), TagAggregateFieldName::Count)
        .expr_as(relevance_expr, TagAggregateFieldName::Relevance)
        .expr_as(user_vote_expr, TagAggregateFieldName::UserVote)
        .from(vote_table.clone())
        .inner_join(
            tag_table.clone(),
            Expr::col((vote_table.clone(), Alias::new("tag_id")))
                .equals((tag_table.clone(), Alias::new("id"))),
        )
        .and_where(Expr::col((vote_table.clone(), entity_id_col)).eq(entity_id))
        .group_by_col((tag_table.clone(), Alias::new("id")))
        .group_by_col((tag_table.clone(), Alias::new("name")))
        .and_having(positive_count_filter)
        .order_by((tag_table.clone(), Alias::new("id")), Order::Asc)
        .limit(u64::from(limit) + 1)
        .to_owned();

    if let Some(cursor) = cursor {
        query = query
            .and_having(
                Expr::col((tag_table.clone(), Alias::new("id"))).gt(cursor),
            )
            .to_owned();
    }

    let builder = repo.conn().get_database_backend();
    let stmt = builder.build(&query);

    let mut items = TagAggregate::find_by_statement(stmt)
        .all(repo.conn())
        .await?;

    let next_cursor = if items.len() > limit as usize {
        items.pop();
        items.last().map(|t| t.id)
    } else {
        None
    };

    Ok(Paginated { items, next_cursor })
}
