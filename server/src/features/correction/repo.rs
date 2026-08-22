use chrono::Utc;
use entity::correction::{Column, Entity};
use entity::enums::{CorrectionStatus, CorrectionUserType, EntityType};
use entity::{
    correction as correction_entity, correction_revision, correction_user,
};
use fastrace::prelude::LocalSpan;
use infra_db::{SeaOrmRepository, SeaOrmTxRepo};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveEnum, ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
    QueryTrait,
};
use sea_query::{Expr, OnConflict, Query, all};

use super::ModerationError;
use crate::features::correction::{
    Correction, CorrectionEntity, CorrectionFilter, CorrectionFilterStatus,
    NewCorrectionMeta,
};
use crate::features::user::User;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(super) struct CorrectionApprover(pub User);

pub enum CreateResult {
    Created(i32),
    Conflict(i32),
}

pub async fn find_one(
    db: &impl ConnectionTrait,
    filter: CorrectionFilter,
) -> Result<Option<Correction>, DatabaseError> {
    let ret = Entity::find()
        .filter(all![
            Column::EntityId.eq(filter.entity_id),
            Column::EntityType.eq(filter.entity_type),
        ])
        .apply_if(filter.status, |query, status| match status {
            CorrectionFilterStatus::Many(many) => {
                query.filter(Column::Status.is_in(many))
            }
            CorrectionFilterStatus::One(one) => {
                query.filter(Column::Status.eq(one))
            }
        })
        .order_by_desc(Column::CreatedAt)
        .one(db)
        .await
        .db_operation("find correction")?
        .map(Into::into);
    Ok(ret)
}

pub async fn lock_pending_correction(
    tx_repo: &SeaOrmTxRepo,
    entity_id: i32,
    entity_type: EntityType,
) -> Result<Option<Correction>, DatabaseError> {
    Entity::find()
        .filter(all![
            Column::EntityId.eq(entity_id),
            Column::EntityType.eq(entity_type),
            Column::Status.eq(CorrectionStatus::Pending),
        ])
        .lock_exclusive()
        .one(tx_repo.conn())
        .await
        .db_operation("lock pending correction")
        .map(|model| model.map(Into::into))
}

pub async fn is_author(
    db: &impl ConnectionTrait,
    user: &User,
    correction: &Correction,
) -> Result<bool, DatabaseError> {
    let count = correction_user::Entity::find()
        .filter(all![
            correction_user::Column::CorrectionId.eq(correction.id),
            correction_user::Column::UserId.eq(user.id),
            correction_user::Column::UserType.eq(CorrectionUserType::Author),
        ])
        .count(db)
        .await
        .db_operation("check correction author")?;
    Ok(count != 0)
}

pub async fn create_approved(
    tx_repo: &SeaOrmTxRepo,
    meta: NewCorrectionMeta<impl CorrectionEntity>,
) -> Result<i32, DatabaseError> {
    let entity_type = meta.entity_type();

    let correction = entity::correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(meta.r#type),
        entity_type: Set(entity_type),
        entity_id: Set(meta.entity_id),
        created_at: NotSet,
        handled_at: NotSet,
    }
    .insert(tx_repo.conn())
    .await
    .db_operation("insert approved correction")?;

    insert_author_and_revision(tx_repo.conn(), correction.id, meta).await?;

    Ok(correction.id)
}

pub async fn create_pending(
    conn: &impl ConnectionTrait,
    meta: NewCorrectionMeta<impl CorrectionEntity>,
) -> Result<CreateResult, DatabaseError> {
    let entity_type = meta.entity_type();

    let query = Query::insert()
        .into_table(Entity)
        .columns([
            Column::Status,
            Column::Type,
            Column::EntityType,
            Column::EntityId,
        ])
        .values_panic([
            CorrectionStatus::Pending.as_enum(),
            meta.r#type.as_enum(),
            entity_type.as_enum(),
            Expr::value(meta.entity_id),
        ])
        .on_conflict(
            OnConflict::columns([Column::EntityType, Column::EntityId])
                .target_and_where(Expr::cust(
                    r#""status" = 'Pending'::"CorrectionStatus""#,
                ))
                .value(
                    Column::EntityId,
                    Expr::column((Entity, Column::EntityId)),
                )
                .to_owned(),
        )
        .returning(
            Query::returning()
                .exprs([Expr::column(Column::Id), Expr::cust("old.id")]),
        )
        .to_owned();
    let statement = conn.get_database_backend().build(&query);
    let row = conn
        .query_one(statement)
        .await
        .db_operation("insert correction")?
        .expect("INSERT ON CONFLICT DO UPDATE always returns a row");
    let (correction_id, previous_correction_id): (i32, Option<i32>) = row
        .try_get_many_by_index()
        .db_operation("decode inserted correction")?;

    if let Some(previous_correction_id) = previous_correction_id {
        return Ok(CreateResult::Conflict(previous_correction_id));
    }

    insert_author_and_revision(conn, correction_id, meta).await?;

    Ok(CreateResult::Created(correction_id))
}

async fn insert_author_and_revision(
    conn: &impl ConnectionTrait,
    correction_id: i32,
    meta: NewCorrectionMeta<impl CorrectionEntity>,
) -> Result<(), DatabaseError> {
    // TODO: remove dupelicate correction user table
    entity::correction_user::Model {
        correction_id,
        user_id: meta.author.id,
        user_type: CorrectionUserType::Author,
    }
    .into_active_model()
    .insert(conn)
    .await
    .db_operation("insert correction author")?;

    correction_revision::Model {
        correction_id,
        entity_history_id: meta.history_id,
        description: meta.description,
        author_id: meta.author.id,
    }
    .into_active_model()
    .insert(conn)
    .await
    .db_operation("insert correction revision")?;

    Ok(())
}

pub async fn update(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
    meta: NewCorrectionMeta<impl CorrectionEntity>,
) -> Result<(), DatabaseError> {
    correction_revision::Model {
        correction_id: id,
        entity_history_id: meta.history_id,
        description: meta.description,
        author_id: meta.author.id,
    }
    .into_active_model()
    .insert(tx_repo.conn())
    .await
    .db_operation("insert correction revision")?;

    Ok(())
}

async fn lock_correction(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
) -> Result<correction_entity::Model, ModerationError> {
    let correction = correction_entity::Entity::find_by_id(correction_id)
        .lock_exclusive()
        .one(tx_repo.conn())
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.lock_by_id",
                error:% = err;
                "correction repository operation failed"
            );
        })
        .db_operation("lock correction")?;

    correction.ok_or(ModerationError::NotFound)
}

async fn insert_approver(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    approver_id: i32,
) -> Result<(), DatabaseError> {
    correction_user::Entity::insert(correction_user::ActiveModel {
        user_id: Set(approver_id),
        correction_id: Set(correction_id),
        user_type: Set(CorrectionUserType::Approver),
    })
    .exec(tx_repo.conn())
    .await
    .inspect_err(|err| {
        log::error!(
            target: "features.correction.repo",
            operation = "correction_user.insert_approver",
            error:% = err;
            "correction repository operation failed"
        );
    })
    .db_operation("insert correction approver")?;

    Ok(())
}

async fn update_correction_status(
    tx_repo: &SeaOrmTxRepo,
    correction: correction_entity::Model,
    status: CorrectionStatus,
) -> Result<correction_entity::Model, DatabaseError> {
    let mut correction_active_model = correction.into_active_model();
    correction_active_model.status = Set(status);
    correction_active_model.handled_at = Set(Some(Utc::now().into()));

    let correction = correction_active_model
        .update(tx_repo.conn())
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.update_status",
                error:% = err;
                "correction repository operation failed"
            );
        })
        .db_operation("update correction status")?;

    Ok(correction)
}

pub async fn find_pending_id(
    repo: &SeaOrmRepository,
    entity_id: i32,
    entity_type: EntityType,
) -> Result<Option<i32>, DatabaseError> {
    LocalSpan::add_properties(|| {
        [
            ("entity_id", entity_id.to_string()),
            ("entity_type", format!("{entity_type:?}")),
        ]
    });

    let model = correction_entity::Entity::find()
        .filter(all![
            correction_entity::Column::EntityId.eq(entity_id),
            correction_entity::Column::EntityType.eq(entity_type),
            correction_entity::Column::Status.eq(CorrectionStatus::Pending),
        ])
        .order_by_desc(correction_entity::Column::CreatedAt)
        .one(&repo.conn)
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.find_pending_id",
                error:% = err;
                "correction repository operation failed"
            );
        })
        .db_operation("find pending correction")?;

    Ok(model.map(|model| model.id))
}

async fn apply_correction_update(
    tx_repo: &SeaOrmTxRepo,
    correction: correction_entity::Model,
) -> Result<(), ModerationError> {
    let apply_update_res = match correction.entity_type {
        EntityType::Artist => {
            crate::features::artist::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Label => {
            crate::features::label::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Release => {
            crate::features::release::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Song => {
            crate::features::song::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Tag => {
            crate::features::tag::repo::apply_update(correction, tx_repo.conn())
                .await
        }
        EntityType::Event => {
            crate::features::event::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::SongLyrics => {
            crate::features::song_lyrics::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::CreditRole => {
            crate::features::credit_role::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
    };

    apply_update_res.db_operation("apply correction update")?;
    Ok(())
}

pub async fn approve(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), ModerationError> {
    LocalSpan::add_properties(|| {
        [
            ("correction_id", correction_id.to_string()),
            ("approver_id", approver.id.to_string()),
        ]
    });

    let correction = lock_correction(tx_repo, correction_id).await?;
    if correction.status != CorrectionStatus::Pending {
        return Err(ModerationError::AlreadyHandled);
    }

    LocalSpan::add_properties(|| {
        [
            ("entity_id", correction.entity_id.to_string()),
            ("entity_type", format!("{:?}", correction.entity_type)),
        ]
    });

    insert_approver(tx_repo, correction_id, approver.id).await?;

    let correction = update_correction_status(
        tx_repo,
        correction,
        CorrectionStatus::Approved,
    )
    .await?;

    apply_correction_update(tx_repo, correction).await?;

    Ok(())
}

pub async fn reject(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), ModerationError> {
    LocalSpan::add_properties(|| {
        [
            ("correction_id", correction_id.to_string()),
            ("approver_id", approver.id.to_string()),
        ]
    });

    let correction = lock_correction(tx_repo, correction_id).await?;
    if correction.status != CorrectionStatus::Pending {
        return Err(ModerationError::AlreadyHandled);
    }

    LocalSpan::add_properties(|| {
        [
            ("entity_id", correction.entity_id.to_string()),
            ("entity_type", format!("{:?}", correction.entity_type)),
        ]
    });

    insert_approver(tx_repo, correction_id, approver.id).await?;

    let _ = update_correction_status(
        tx_repo,
        correction,
        CorrectionStatus::Rejected,
    )
    .await?;

    Ok(())
}

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use std::future::Future;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::task::Poll;

    use anyhow::{Context, Result, bail};
    use async_trait::async_trait;
    use entity::enums::{
        CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
    };
    use entity::{
        correction, correction_revision, correction_user, song_history,
    };
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::{
        ActiveModelTrait, ConnectionTrait, DatabaseTransaction, DbBackend,
        DbErr, EntityTrait, ExecResult, IntoActiveModel, QueryResult,
        QuerySelect, RuntimeErr, SqlxError, Statement, TransactionTrait,
    };
    use sea_query::{LockBehavior, LockType};
    use tokio::sync::Barrier;

    use super::{CreateResult, create_pending};
    use crate::features::correction::{CorrectionEntity, NewCorrectionMeta};
    use crate::infra::integration_test::fixture::{MockSong, MockUser};
    use crate::infra::integration_test::test_connection;

    struct SongCorrection;

    impl CorrectionEntity for SongCorrection {
        fn entity_type() -> EntityType {
            EntityType::Song
        }
    }

    struct ConflictBarrierConnection {
        conn: DatabaseTransaction,
        insert_observed: AtomicBool,
        insert_returned: Arc<Barrier>,
        submission_release: Arc<Barrier>,
    }

    impl ConflictBarrierConnection {
        const fn new(
            conn: DatabaseTransaction,
            insert_returned: Arc<Barrier>,
            submission_release: Arc<Barrier>,
        ) -> Self {
            Self {
                conn,
                insert_observed: AtomicBool::new(false),
                insert_returned,
                submission_release,
            }
        }

        fn into_inner(self) -> DatabaseTransaction {
            self.conn
        }
    }

    #[async_trait]
    impl ConnectionTrait for ConflictBarrierConnection {
        fn get_database_backend(&self) -> DbBackend {
            self.conn.get_database_backend()
        }

        async fn execute(&self, stmt: Statement) -> Result<ExecResult, DbErr> {
            self.conn.execute(stmt).await
        }

        async fn execute_unprepared(
            &self,
            sql: &str,
        ) -> Result<ExecResult, DbErr> {
            self.conn.execute_unprepared(sql).await
        }

        async fn query_one(
            &self,
            stmt: Statement,
        ) -> Result<Option<QueryResult>, DbErr> {
            let row = self.conn.query_one(stmt).await?;

            if !self.insert_observed.swap(true, Ordering::AcqRel) {
                self.insert_returned.wait().await;
                self.submission_release.wait().await;
            }

            Ok(row)
        }

        async fn query_all(
            &self,
            stmt: Statement,
        ) -> Result<Vec<QueryResult>, DbErr> {
            self.conn.query_all(stmt).await
        }
    }

    async fn insert_song_history(
        conn: &impl ConnectionTrait,
        title: &str,
    ) -> Result<song_history::Model> {
        Ok(song_history::Entity::insert(song_history::ActiveModel {
            id: NotSet,
            title: Set(title.to_owned()),
        })
        .exec_with_returning(conn)
        .await?)
    }

    async fn insert_pending_correction(
        conn: &impl ConnectionTrait,
        author_id: i32,
        entity_id: i32,
        history_id: i32,
    ) -> Result<correction::Model> {
        let correction = correction::Entity::insert(correction::ActiveModel {
            id: NotSet,
            status: Set(CorrectionStatus::Pending),
            r#type: Set(CorrectionType::Update),
            entity_type: Set(EntityType::Song),
            entity_id: Set(entity_id),
            created_at: NotSet,
            handled_at: NotSet,
        })
        .exec_with_returning(conn)
        .await?;

        correction_user::Entity::insert(correction_user::ActiveModel {
            correction_id: Set(correction.id),
            user_id: Set(author_id),
            user_type: Set(CorrectionUserType::Author),
        })
        .exec(conn)
        .await?;
        correction_revision::Entity::insert(correction_revision::ActiveModel {
            correction_id: Set(correction.id),
            entity_history_id: Set(history_id),
            author_id: Set(author_id),
            description: Set("existing correction".to_owned()),
        })
        .exec(conn)
        .await?;

        Ok(correction)
    }

    #[tokio::test]
    async fn create_pending_holds_conflicting_row_lock_until_transaction_ends()
    -> Result<()> {
        let conn = test_connection().await;
        let author = MockUser::with_label("correction_race_author")
            .insert(&conn)
            .await?;
        let song = MockSong::titled("correction race song")
            .insert(&conn)
            .await?;
        let existing_history =
            insert_song_history(&conn, "existing correction").await?;
        let replacement_history =
            insert_song_history(&conn, "replacement correction").await?;
        let existing = insert_pending_correction(
            &conn,
            author.id,
            song.id,
            existing_history.id,
        )
        .await?;
        let existing_id = existing.id;

        let insert_returned = Arc::new(Barrier::new(2));
        let submission_release = Arc::new(Barrier::new(2));
        let mut submission = tokio::spawn({
            let conn = conn.clone();
            let insert_returned = Arc::clone(&insert_returned);
            let submission_release = Arc::clone(&submission_release);
            let author = author.into();

            async move {
                let tx = conn.begin().await?;
                let conn = ConflictBarrierConnection::new(
                    tx,
                    insert_returned,
                    submission_release,
                );
                let result = create_pending(
                    &conn,
                    NewCorrectionMeta::<SongCorrection> {
                        author,
                        r#type: CorrectionType::Update,
                        entity_id: song.id,
                        history_id: replacement_history.id,
                        description: "replacement correction".to_owned(),
                        phantom: std::marker::PhantomData,
                    },
                )
                .await?;
                conn.into_inner().rollback().await?;

                Ok::<_, anyhow::Error>(result)
            }
        });

        tokio::select! {
            _ = insert_returned.wait() => {}
            result = &mut submission => {
                let _ = result??;
                bail!("submission completed before returning the pending insert");
            }
        }
        let lock_attempt = conn.begin().await?;
        let Err(error) = correction::Entity::find_by_id(existing_id)
            .lock_with_behavior(LockType::Update, LockBehavior::Nowait)
            .one(&lock_attempt)
            .await
        else {
            bail!("conflicting correction was not locked");
        };
        assert!(matches!(
            error,
            DbErr::Query(RuntimeErr::SqlxError(SqlxError::Database(error)))
                if error.code().as_deref() == Some("55P03")
        ));
        lock_attempt.rollback().await?;

        submission_release.wait().await;

        match submission.await?? {
            CreateResult::Conflict(id) => assert_eq!(id, existing_id),
            CreateResult::Created(id) => {
                bail!("submission unexpectedly created correction {id}")
            }
        }
        let lock_after_submission = conn.begin().await?;
        let correction = correction::Entity::find_by_id(existing_id)
            .lock_with_behavior(LockType::Update, LockBehavior::Nowait)
            .one(&lock_after_submission)
            .await?;
        lock_after_submission.rollback().await?;

        assert!(correction.is_some());

        Ok(())
    }

    #[tokio::test]
    async fn create_pending_creates_new_correction_after_moderation_commits()
    -> Result<()> {
        let conn = test_connection().await;
        let author = MockUser::with_label("correction_reverse_race_author")
            .insert(&conn)
            .await?;
        let song = MockSong::titled("correction reverse race song")
            .insert(&conn)
            .await?;
        let existing_history =
            insert_song_history(&conn, "existing reverse correction").await?;
        let replacement_history =
            insert_song_history(&conn, "replacement reverse correction")
                .await?;
        let existing = insert_pending_correction(
            &conn,
            author.id,
            song.id,
            existing_history.id,
        )
        .await?;

        let moderation = conn.begin().await?;
        let mut moderated = existing.clone().into_active_model();
        moderated.status = Set(CorrectionStatus::Rejected);
        moderated.update(&moderation).await?;

        let submission = conn.begin().await?;
        let mut create = Box::pin(create_pending(
            &submission,
            NewCorrectionMeta::<SongCorrection> {
                author: author.into(),
                r#type: CorrectionType::Update,
                entity_id: song.id,
                history_id: replacement_history.id,
                description: "replacement reverse correction".to_owned(),
                phantom: std::marker::PhantomData,
            },
        ));
        let first_poll =
            std::future::poll_fn(|cx| Poll::Ready(create.as_mut().poll(cx)))
                .await;
        assert!(
            first_poll.is_pending(),
            "submission completed before moderation committed"
        );

        moderation.commit().await?;
        let created_id = match create.await? {
            CreateResult::Created(id) => id,
            CreateResult::Conflict(id) => {
                bail!("submission returned stale conflict {id}")
            }
        };
        submission.commit().await?;

        assert_ne!(created_id, existing.id);
        let created = correction::Entity::find_by_id(created_id)
            .one(&conn)
            .await?
            .context("created correction should exist")?;
        assert_eq!(created.status, CorrectionStatus::Pending);

        Ok(())
    }
}
