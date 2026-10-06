use entity::{release, release_rating, song, song_rating};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use infra_error::{BoxedError, EntityNotFound};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveEnum, ColumnTrait, ConnectionTrait, EntityTrait, FromQueryResult,
    PaginatorTrait, QueryFilter,
};
use sea_query::{
    Alias, Expr, ExprTrait, Func, Iden, OnConflict, Query, SimpleExpr,
};

mod model;

pub use model::{Rating, RatingSummary, RatingTarget, RatingTargetKind};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorKind {
    NotFound,
    Internal,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("{source}")]
pub struct Error {
    kind: ErrorKind,
    #[error(source)]
    source: BoxedError,
}

impl Error {
    pub const fn kind(&self) -> ErrorKind {
        self.kind
    }
}

impl From<EntityNotFound> for Error {
    fn from(source: EntityNotFound) -> Self {
        Self {
            kind: ErrorKind::NotFound,
            source: Box::new(source),
        }
    }
}

impl From<DatabaseError> for Error {
    fn from(source: DatabaseError) -> Self {
        Self {
            kind: ErrorKind::Internal,
            source: Box::new(source),
        }
    }
}

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

#[derive(Debug, FromQueryResult)]
struct RatingSummaryRow {
    average: Option<f64>,
    count: i64,
    user_rating: Option<Rating>,
}

async fn ensure_target_exists(
    conn: &impl ConnectionTrait,
    target: RatingTarget,
) -> Result<(), Error> {
    let exists = match target.kind {
        RatingTargetKind::Release => release::Entity::find_by_id(target.id)
            .exists(conn)
            .await
            .db_operation("check release rating target exists")?,
        RatingTargetKind::Song => song::Entity::find_by_id(target.id)
            .exists(conn)
            .await
            .db_operation("check song rating target exists")?,
    };

    if exists {
        Ok(())
    } else {
        Err(EntityNotFound::new(
            match target.kind {
                RatingTargetKind::Release => "Release",
                RatingTargetKind::Song => "Song",
            },
            target.id,
        )
        .into())
    }
}

pub async fn get(
    conn: &impl ConnectionTrait,
    target: RatingTarget,
    user_id: Option<i32>,
) -> Result<RatingSummary, Error> {
    #[derive(Iden)]
    enum Ratings {
        Table,
        UserId,
        Rating,
    }

    ensure_target_exists(conn, target).await?;

    let ratings = match target.kind {
        RatingTargetKind::Release => Query::select()
            .columns([
                release_rating::Column::UserId,
                release_rating::Column::Rating,
            ])
            .from(release_rating::Entity)
            .and_where(
                Expr::col(release_rating::Column::ReleaseId).eq(target.id),
            )
            .to_owned(),
        RatingTargetKind::Song => Query::select()
            .columns([song_rating::Column::UserId, song_rating::Column::Rating])
            .from(song_rating::Entity)
            .and_where(Expr::col(song_rating::Column::SongId).eq(target.id))
            .to_owned(),
    };

    let user_rating: SimpleExpr = user_id.map_or_else(
        || Expr::val(Option::<Rating>::None).into(),
        |user_id| {
            SimpleExpr::SubQuery(
                None,
                Box::new(
                    Query::select()
                        .column(Ratings::Rating)
                        .from_subquery(ratings.clone(), Ratings::Table)
                        .and_where(Expr::col(Ratings::UserId).eq(user_id))
                        .limit(1)
                        .to_owned()
                        .into_sub_query_statement(),
                ),
            )
        },
    );

    let query = Query::select()
        .expr_as(
            Expr::expr(
                Func::avg(Expr::col((Ratings::Table, Ratings::Rating)))
                    .cast_as("double precision"),
            ),
            Alias::new("average"),
        )
        .expr_as(
            Expr::col((Ratings::Table, Ratings::Rating)).count(),
            Alias::new("count"),
        )
        .expr_as(user_rating, Alias::new("user_rating"))
        .from_subquery(ratings, Ratings::Table)
        .to_owned();

    let row = RatingSummaryRow::find_by_statement(
        conn.get_database_backend().build(&query),
    )
    .one(conn)
    .await
    .db_operation("load rating summary")?
    .ok_or_else(|| {
        DatabaseError::internal("rating aggregate returned no row")
    })?;

    let count = u64::try_from(row.count).map_err(|error| {
        DatabaseError::internal(format!("invalid rating count: {error}"))
    })?;

    Ok(RatingSummary {
        average: row.average.map(|average| average / 2.0),
        count,
        user_rating: row.user_rating,
    })
}

pub async fn set(
    conn: &impl ConnectionTrait,
    target: RatingTarget,
    user_id: i32,
    rating_value: Rating,
) -> Result<(), Error> {
    ensure_target_exists(conn, target).await?;

    match target.kind {
        RatingTargetKind::Release => {
            release_rating::Entity::insert(release_rating::ActiveModel {
                release_id: Set(target.id),
                user_id: Set(user_id),
                rating: Set(rating_value.to_value()),
            })
            .on_conflict(
                OnConflict::columns([
                    release_rating::Column::ReleaseId,
                    release_rating::Column::UserId,
                ])
                .update_column(release_rating::Column::Rating)
                .to_owned(),
            )
            .exec_without_returning(conn)
            .await
        }
        RatingTargetKind::Song => {
            song_rating::Entity::insert(song_rating::ActiveModel {
                song_id: Set(target.id),
                user_id: Set(user_id),
                rating: Set(rating_value.to_value()),
            })
            .on_conflict(
                OnConflict::columns([
                    song_rating::Column::SongId,
                    song_rating::Column::UserId,
                ])
                .update_column(song_rating::Column::Rating)
                .to_owned(),
            )
            .exec_without_returning(conn)
            .await
        }
    }
    .db_operation("set rating")?;

    Ok(())
}

pub async fn delete(
    conn: &impl ConnectionTrait,
    target: RatingTarget,
    user_id: i32,
) -> Result<(), Error> {
    ensure_target_exists(conn, target).await?;

    match target.kind {
        RatingTargetKind::Release => {
            release_rating::Entity::delete_many()
                .filter(release_rating::Column::ReleaseId.eq(target.id))
                .filter(release_rating::Column::UserId.eq(user_id))
                .exec(conn)
                .await
        }
        RatingTargetKind::Song => {
            song_rating::Entity::delete_many()
                .filter(song_rating::Column::SongId.eq(target.id))
                .filter(song_rating::Column::UserId.eq(user_id))
                .exec(conn)
                .await
        }
    }
    .db_operation("delete rating")?;

    Ok(())
}
