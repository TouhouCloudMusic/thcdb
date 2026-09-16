use std::collections::HashSet;
use std::str::FromStr;
use std::time::{Duration, SystemTime};

use entity::enums::StorageBackend;
use entity::image;
use futures_util::TryStreamExt;
use infra_db::SeaOrmRepository;
use infra_db::error::DatabaseResultExt;
use infra_storage::FsStorage;
use infra_worker::{
    CronStream, Data, Monitor, Schedule, WorkerBuilder, WorkerBuilderExt,
    WorkerError, WorkerFactoryFn,
};
use sea_orm::{
    ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
    TransactionTrait,
};
use sea_query::{Alias, Expr, Func, LockBehavior, LockType};

use crate::infra::storage::file::try_lock_objects;

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

const RETENTION: Duration = Duration::from_hours(90 * 24);
const IMAGE_BATCH_SIZE: u64 = 100;
const OBJECT_BATCH_SIZE: usize = 32;

pub(crate) fn register_workers(
    monitor: Monitor,
    repo: SeaOrmRepository,
    storage: FsStorage,
) -> Monitor {
    monitor.register(
        WorkerBuilder::new("image_cleanup")
            .data(repo)
            .data(storage)
            .enable_tracing()
            .backend(CronStream::new(
                Schedule::from_str("0 0 3 * * *")
                    .expect("image cleanup schedule"),
            ))
            .build_fn(
                |_job: (),
                 repo: Data<SeaOrmRepository>,
                 storage: Data<FsStorage>| async move {
                    collect(&repo.conn, &storage).await
                },
            ),
    )
}

pub(crate) async fn collect(
    conn: &sea_orm::DatabaseConnection,
    storage: &FsStorage,
) -> Result<(), WorkerError> {
    loop {
        let tx = conn
            .begin()
            .await
            .db_operation("begin image cleanup transaction")?;

        let expired = image::Entity::find()
            .filter(image::Column::Backend.eq(StorageBackend::Fs))
            .filter(
                Expr::col((image::Entity, image::Column::UnreferencedSince))
                    .lte(
                        Expr::current_timestamp().sub(
                            Expr::val(format!(
                                "{} seconds",
                                RETENTION.as_secs()
                            ))
                            .cast_as(Alias::new("interval")),
                        ),
                    ),
            )
            .order_by_asc(image::Column::Id)
            .limit(IMAGE_BATCH_SIZE)
            .lock_with_behavior(LockType::Update, LockBehavior::SkipLocked)
            .all(&tx)
            .await
            .db_operation("select expired images")?;

        if expired.is_empty() {
            tx.commit()
                .await
                .db_operation("commit image cleanup transaction")?;
            break;
        }

        let result = image::Entity::delete_many()
            .filter(
                image::Column::Id.is_in(expired.iter().map(|image| image.id)),
            )
            .filter(
                Expr::expr(
                    Func::cust(Alias::new("image_is_referenced"))
                        .arg(Expr::col(image::Column::Id)),
                )
                .eq(false),
            )
            .exec(&tx)
            .await
            .db_operation("delete expired image records")?;

        // Commit the removal of logical records before touching shared files.
        tx.commit()
            .await
            .db_operation("commit image cleanup transaction")?;

        if result.rows_affected == 0 {
            break;
        }
    }

    let mut objects = std::pin::pin!(storage.list());
    let mut old_object_keys = Vec::with_capacity(OBJECT_BATCH_SIZE);

    while let Some(object) = objects.try_next().await? {
        if SystemTime::now()
            .duration_since(object.last_modified)
            .unwrap_or_default()
            >= RETENTION
        {
            old_object_keys.push(object.object_key);

            if old_object_keys.len() == OBJECT_BATCH_SIZE {
                remove_unreferenced_objects(conn, storage, &old_object_keys)
                    .await?;
                old_object_keys.clear();
            }
        }
    }

    remove_unreferenced_objects(conn, storage, &old_object_keys).await?;

    Ok(())
}

async fn remove_unreferenced_objects(
    conn: &sea_orm::DatabaseConnection,
    storage: &FsStorage,
    object_keys: &[String],
) -> Result<(), WorkerError> {
    if object_keys.is_empty() {
        return Ok(());
    }

    let tx = conn
        .begin()
        .await
        .db_operation("begin image object cleanup transaction")?;

    let locked_object_keys = try_lock_objects(&tx, object_keys)
        .await
        .db_operation("lock image objects for cleanup")?;

    if locked_object_keys.is_empty() {
        tx.commit()
            .await
            .db_operation("commit image object cleanup transaction")?;
        return Ok(());
    }

    let recorded_object_keys: HashSet<String> = image::Entity::find()
        .select_only()
        .column(image::Column::ObjectKey)
        .filter(image::Column::Backend.eq(StorageBackend::Fs))
        .filter(
            image::Column::ObjectKey
                .is_in(locked_object_keys.iter().map(String::as_str)),
        )
        .into_tuple()
        .all(&tx)
        .await
        .db_operation("check image object references")?
        .into_iter()
        .collect();

    for object_key in &locked_object_keys {
        if !recorded_object_keys.contains(object_key) {
            // Re-read after locking because an upload may have recreated this
            // path since it was listed.
            if let Some(modified) = storage.last_modified(object_key).await?
                && SystemTime::now()
                    .duration_since(modified)
                    .unwrap_or_default()
                    >= RETENTION
            {
                // Unlink synchronously: cancellation must not release the locks
                // before deletion finishes.
                storage.remove(object_key)?;
            }
        }
    }

    tx.commit()
        .await
        .db_operation("commit image object cleanup transaction")?;
    Ok(())
}
