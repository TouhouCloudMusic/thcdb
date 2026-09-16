use std::path::Path;
use std::time::{Duration, SystemTime};

use anyhow::{Context, Result, bail};
use bytesize::ByteSize;
use chrono::{Duration as ChronoDuration, Utc};
use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::{
    ArtistImageType, ImageQueueStatus, ReleaseImageType,
};
use entity::{artist_image, image, image_queue, release_image, user};
use infra_db::SeaOrmRepository;
use infra_storage::FsStorage;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseBackend, EntityTrait,
    IsolationLevel, Statement, TransactionTrait, Value,
};
use sea_query::{Alias, Func, Query};

use super::{collect, remove_unreferenced_objects};
use crate::features::image_upload::{
    CreateImageMeta, ParseOption, Parser, Service,
};
use crate::infra::integration_test::fixture::{
    MockArtist, MockRelease, MockUser,
};
use crate::infra::integration_test::test_connection;
use crate::infra::storage::GenericFileStorage;

// GC scans the shared database, so separate file directories do not isolate
// these tests.
static GC_TEST_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn parser() -> Parser {
    ParseOption::builder()
        .valid_formats(&[::image::ImageFormat::Png])
        .file_size_range(ByteSize::b(1)..=ByteSize::mib(1))
        .size_range(1..=32_768)
        .build()
        .into_parser()
}

fn png(seed: i32) -> Result<Vec<u8>> {
    use ::image::codecs::png::PngEncoder;
    use ::image::{ColorType, ImageEncoder};

    let seed = seed.to_le_bytes();
    let mut bytes = Vec::new();
    PngEncoder::new(&mut bytes).write_image(
        &[
            seed[0], 0, 0, seed[1], 255, 0, seed[2], 0, 255, seed[3], 255, 255,
        ],
        2,
        2,
        ColorType::Rgb8.into(),
    )?;
    Ok(bytes)
}

async fn upload(
    conn: &sea_orm::DatabaseConnection,
    base_path: &Path,
    bytes: &[u8],
    uploaded_by: i32,
) -> Result<domain::image::Image> {
    let repository = SeaOrmRepository::new(conn.clone());
    let transaction = repository.begin_tx().await?;
    let storage = FsStorage::new(base_path.to_path_buf())?;
    let service =
        Service::new(transaction.clone(), GenericFileStorage::new(storage));
    let image = service
        .create(bytes, &parser(), CreateImageMeta { uploaded_by })
        .await?;
    drop(service);
    transaction.commit().await?;
    Ok(image)
}

async fn insert_image(
    conn: &sea_orm::DatabaseConnection,
    uploaded_by: i32,
    object_key: &str,
) -> Result<image::Model> {
    image::Entity::insert(image::ActiveModel {
        id: NotSet,
        uploaded_by: Set(uploaded_by),
        uploaded_at: NotSet,
        backend: Set(StorageBackend::Fs),
        object_key: Set(object_key.to_owned()),
        unreferenced_since: Set(Some(Utc::now().fixed_offset())),
    })
    .exec_with_returning(conn)
    .await
    .map_err(Into::into)
}

fn age_file(base_path: &Path, object_key: &str, days: u64) -> Result<()> {
    let modified = SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60);
    std::fs::File::open(base_path.join(object_key))?
        .set_times(std::fs::FileTimes::new().set_modified(modified))?;
    Ok(())
}

async fn set_unreferenced_days_ago(
    conn: &sea_orm::DatabaseConnection,
    id: i32,
    days: i64,
) -> Result<()> {
    let model = image::Entity::find_by_id(id)
        .one(conn)
        .await?
        .context(format!("image {id} not found"))?;
    let mut active: image::ActiveModel = model.into();
    active.unreferenced_since = Set(Some(
        (Utc::now() - ChronoDuration::days(days)).fixed_offset(),
    ));
    active.update(conn).await?;
    Ok(())
}

async fn insert_rejected_queue(
    conn: &sea_orm::DatabaseConnection,
    image_id: i32,
    user_id: i32,
) -> Result<image_queue::Model> {
    image_queue::Entity::insert(image_queue::ActiveModel {
        id: NotSet,
        image_id: Set(Some(image_id)),
        status: Set(ImageQueueStatus::Rejected),
        handled_at: Set(Some(Utc::now().fixed_offset())),
        handled_by: Set(Some(user_id)),
        reverted_at: Set(None),
        reverted_by: Set(None),
        created_at: NotSet,
        created_by: Set(user_id),
    })
    .exec_with_returning(conn)
    .await
    .map_err(Into::into)
}

#[tokio::test]
async fn rejected_queue_keeps_image_referenced() -> Result<()> {
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("image_gc_rejected")
        .insert(&conn)
        .await?;
    let image =
        insert_image(&conn, uploader.id, "rejected-queue-image").await?;

    insert_rejected_queue(&conn, image.id, uploader.id).await?;
    let image = image::Entity::find_by_id(image.id)
        .one(&conn)
        .await?
        .context("rejected queue image disappeared")?;
    assert!(image.unreferenced_since.is_none());
    Ok(())
}

#[tokio::test]
async fn retention_starts_only_after_last_reference_is_removed() -> Result<()> {
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("image_retention_queue_removal")
        .insert(&conn)
        .await?;
    let image =
        insert_image(&conn, uploader.id, "queue-retention-image").await?;
    let queue = insert_rejected_queue(&conn, image.id, uploader.id).await?;
    let artist =
        MockArtist::named(format!("retained image artist {}", uploader.id))
            .insert(&conn)
            .await?;
    artist_image::Entity::insert(artist_image::ActiveModel {
        artist_id: Set(artist.id),
        image_id: Set(image.id),
        r#type: Set(ArtistImageType::Profile),
    })
    .exec(&conn)
    .await?;

    artist_image::Entity::delete_by_id((artist.id, image.id))
        .exec(&conn)
        .await?;
    assert!(
        image::Entity::find_by_id(image.id)
            .one(&conn)
            .await?
            .context("image disappeared while its queue reference remained")?
            .unreferenced_since
            .is_none()
    );

    let queue_deletion_started_at = database_clock(&conn).await?;
    image_queue::Entity::delete_by_id(queue.id)
        .exec(&conn)
        .await?;
    let queue_deletion_finished_at = database_clock(&conn).await?;
    let unreferenced_since = image::Entity::find_by_id(image.id)
        .one(&conn)
        .await?
        .context(
            "image disappeared after its last queue reference was removed",
        )?
        .unreferenced_since
        .context("removing the last queue reference did not start retention")?;

    assert!(
        (queue_deletion_started_at..=queue_deletion_finished_at)
            .contains(&unreferenced_since)
    );
    Ok(())
}

#[tokio::test]
async fn concurrent_reference_removals_start_retention() -> Result<()> {
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("image_retention_concurrent")
        .insert(&conn)
        .await?;
    let image =
        insert_image(&conn, uploader.id, "concurrent-retention-image").await?;
    let queue = insert_rejected_queue(&conn, image.id, uploader.id).await?;
    let artist = MockArtist::named(format!(
        "concurrent retention artist {}",
        uploader.id
    ))
    .insert(&conn)
    .await?;
    artist_image::Entity::insert(artist_image::ActiveModel {
        artist_id: Set(artist.id),
        image_id: Set(image.id),
        r#type: Set(ArtistImageType::Profile),
    })
    .exec(&conn)
    .await?;

    let transaction_a = conn
        .begin_with_config(Some(IsolationLevel::ReadCommitted), None)
        .await?;
    let transaction_b = conn
        .begin_with_config(Some(IsolationLevel::ReadCommitted), None)
        .await?;
    let blocking_pid = backend_pid(&transaction_a).await?;
    let waiting_pid = backend_pid(&transaction_b).await?;

    artist_image::Entity::delete_by_id((artist.id, image.id))
        .exec(&transaction_a)
        .await?;

    let blocked_at = {
        let mut deletion = Box::pin(
            image_queue::Entity::delete_by_id(queue.id).exec(&transaction_b),
        );
        let blocked_at = tokio::select! {
            deletion_result = &mut deletion => bail!(
                "queue deletion completed before transaction A commit: {deletion_result:?}"
            ),
            wait_result = wait_until_transaction_is_blocked_by(
                &conn, waiting_pid, blocking_pid,
            ) => {
                wait_result?;
                database_clock(&conn).await?
            },
        };
        tokio::time::timeout(
            CONCURRENT_TEST_CLEANUP_DEADLINE,
            transaction_a.commit(),
        )
        .await
        .context("transaction A commit did not finish in time")??;
        tokio::time::timeout(CONCURRENT_TEST_CLEANUP_DEADLINE, &mut deletion)
            .await
            .context("queue deletion did not finish in time")??;
        blocked_at
    };

    tokio::time::timeout(
        CONCURRENT_TEST_CLEANUP_DEADLINE,
        transaction_b.commit(),
    )
    .await
    .context("transaction B commit did not finish in time")??;
    let committed_at = database_clock(&conn).await?;
    assert!(
        artist_image::Entity::find_by_id((artist.id, image.id))
            .one(&conn)
            .await?
            .is_none()
    );
    assert!(
        image_queue::Entity::find_by_id(queue.id)
            .one(&conn)
            .await?
            .is_none()
    );
    let unreferenced_since = image::Entity::find_by_id(image.id)
        .one(&conn)
        .await?
        .context("image disappeared after concurrent removals")?
        .unreferenced_since
        .context("concurrent removals did not start retention")?;
    assert!((blocked_at..=committed_at).contains(&unreferenced_since));
    Ok(())
}

#[tokio::test]
async fn gc_keeps_shared_object_when_another_image_references_it() -> Result<()>
{
    let _gc_guard = GC_TEST_LOCK.lock().await;
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("image_gc_shared")
        .insert(&conn)
        .await?;
    let directory = tempfile::tempdir()?;
    let storage = FsStorage::new(directory.path().to_path_buf())?;
    let bytes = b"shared object";
    let object_key = "gc-shared-object";
    storage.create(object_key, bytes.to_vec()).await?;
    let expired_image = insert_image(&conn, uploader.id, object_key).await?;
    let retained_image = insert_image(&conn, uploader.id, object_key).await?;
    age_file(directory.path(), &expired_image.object_key, 91)?;
    set_unreferenced_days_ago(&conn, expired_image.id, 91).await?;

    collect(&conn, &storage)
        .await
        .map_err(anyhow::Error::from_boxed)?;

    assert!(
        image::Entity::find_by_id(expired_image.id)
            .one(&conn)
            .await?
            .is_none()
    );
    assert!(
        image::Entity::find_by_id(retained_image.id)
            .one(&conn)
            .await?
            .is_some()
    );
    assert!(
        storage
            .last_modified(&expired_image.object_key)
            .await?
            .is_some()
    );
    Ok(())
}

#[tokio::test]
async fn gc_reclaims_unreferenced_image_and_object_after_retention()
-> Result<()> {
    let _gc_guard = GC_TEST_LOCK.lock().await;
    let conn = test_connection().await?;
    let user = MockUser::with_label("image_gc_last_reference")
        .insert(&conn)
        .await?;
    let directory = tempfile::tempdir()?;
    let storage = FsStorage::new(directory.path().to_path_buf())?;
    let object_key = "gc-retention-object";
    let bytes = b"retention object";
    storage.create(object_key, bytes.to_vec()).await?;
    let image = insert_image(&conn, user.id, object_key).await?;
    age_file(directory.path(), &image.object_key, 89)?;
    set_unreferenced_days_ago(&conn, image.id, 89).await?;

    collect(&conn, &storage)
        .await
        .map_err(anyhow::Error::from_boxed)?;

    assert!(
        image::Entity::find_by_id(image.id)
            .one(&conn)
            .await?
            .is_some()
    );
    assert!(storage.last_modified(&image.object_key).await?.is_some());

    age_file(directory.path(), &image.object_key, 91)?;
    set_unreferenced_days_ago(&conn, image.id, 91).await?;
    collect(&conn, &storage)
        .await
        .map_err(anyhow::Error::from_boxed)?;

    assert!(
        image::Entity::find_by_id(image.id)
            .one(&conn)
            .await?
            .is_none()
    );
    assert!(storage.last_modified(&image.object_key).await?.is_none());
    Ok(())
}

#[tokio::test]
async fn changing_avatar_moves_reference_to_new_image() -> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("image_gc_avatar_update")
        .insert(&conn)
        .await?;
    let image_a = insert_image(&conn, user.id, "avatar-image-a").await?;
    let image_b = insert_image(&conn, user.id, "avatar-image-b").await?;

    let user_model = user::Entity::find_by_id(user.id)
        .one(&conn)
        .await?
        .context("avatar test user disappeared")?;
    let mut user_active: user::ActiveModel = user_model.into();
    user_active.avatar_id = Set(Some(image_a.id));
    user_active.update(&conn).await?;
    assert!(
        image::Entity::find_by_id(image_a.id)
            .one(&conn)
            .await?
            .context("avatar image A disappeared")?
            .unreferenced_since
            .is_none()
    );

    let user_model = user::Entity::find_by_id(user.id)
        .one(&conn)
        .await?
        .context("avatar test user disappeared before replacement")?;
    let mut user_active: user::ActiveModel = user_model.into();
    user_active.avatar_id = Set(Some(image_b.id));
    user_active.update(&conn).await?;

    assert!(
        image::Entity::find_by_id(image_a.id)
            .one(&conn)
            .await?
            .context("avatar image A disappeared after replacement")?
            .unreferenced_since
            .is_some()
    );
    assert!(
        image::Entity::find_by_id(image_b.id)
            .one(&conn)
            .await?
            .context("avatar image B disappeared after replacement")?
            .unreferenced_since
            .is_none()
    );
    Ok(())
}

#[tokio::test]
async fn changing_profile_banner_moves_reference_to_new_image() -> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("image_gc_profile_banner_update")
        .insert(&conn)
        .await?;
    let image_a =
        insert_image(&conn, user.id, "profile-banner-image-a").await?;
    let image_b =
        insert_image(&conn, user.id, "profile-banner-image-b").await?;

    let user_model = user::Entity::find_by_id(user.id)
        .one(&conn)
        .await?
        .context("profile banner test user disappeared")?;
    let mut user_active: user::ActiveModel = user_model.into();
    user_active.profile_banner_id = Set(Some(image_a.id));
    user_active.update(&conn).await?;
    assert!(
        image::Entity::find_by_id(image_a.id)
            .one(&conn)
            .await?
            .context("profile banner image A disappeared")?
            .unreferenced_since
            .is_none()
    );

    let replacement_started_at = database_clock(&conn).await?;
    let user_model = user::Entity::find_by_id(user.id)
        .one(&conn)
        .await?
        .context("profile banner test user disappeared before replacement")?;
    let mut user_active: user::ActiveModel = user_model.into();
    user_active.profile_banner_id = Set(Some(image_b.id));
    user_active.update(&conn).await?;
    let replacement_finished_at = database_clock(&conn).await?;

    let old_image = image::Entity::find_by_id(image_a.id)
        .one(&conn)
        .await?
        .context("profile banner image A disappeared after replacement")?;
    let unreferenced_since = old_image
        .unreferenced_since
        .context("replacing the profile banner did not start retention")?;
    assert!(
        (replacement_started_at..=replacement_finished_at)
            .contains(&unreferenced_since)
    );
    assert!(
        image::Entity::find_by_id(image_b.id)
            .one(&conn)
            .await?
            .context("profile banner image B disappeared after replacement")?
            .unreferenced_since
            .is_none()
    );
    Ok(())
}

#[tokio::test]
async fn removing_last_artist_image_reference_starts_retention() -> Result<()> {
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("artist_reference_removal")
        .insert(&conn)
        .await?;
    let artist =
        MockArtist::named(format!("artist reference removal {}", uploader.id))
            .insert(&conn)
            .await?;
    let image =
        insert_image(&conn, uploader.id, "artist-removal-image").await?;

    artist_image::Entity::insert(artist_image::ActiveModel {
        artist_id: Set(artist.id),
        image_id: Set(image.id),
        r#type: Set(ArtistImageType::Profile),
    })
    .exec(&conn)
    .await?;
    assert!(
        image::Entity::find_by_id(image.id)
            .one(&conn)
            .await?
            .context("artist image disappeared after insertion")?
            .unreferenced_since
            .is_none()
    );

    let reference_removal_started_at = database_clock(&conn).await?;
    artist_image::Entity::delete_by_id((artist.id, image.id))
        .exec(&conn)
        .await?;
    let reference_removal_finished_at = database_clock(&conn).await?;

    let image = image::Entity::find_by_id(image.id)
        .one(&conn)
        .await?
        .context("artist image disappeared")?;
    let unreferenced_since = image.unreferenced_since.context(
        "removing the last artist image reference did not start retention",
    )?;
    assert!(
        (reference_removal_started_at..=reference_removal_finished_at)
            .contains(&unreferenced_since)
    );
    Ok(())
}

#[tokio::test]
async fn removing_last_release_image_reference_starts_retention() -> Result<()>
{
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("release_reference_removal")
        .insert(&conn)
        .await?;
    let release = MockRelease::titled(format!(
        "release reference removal {}",
        uploader.id
    ))
    .insert(&conn)
    .await?;
    let image =
        insert_image(&conn, uploader.id, "release-removal-image").await?;

    release_image::Entity::insert(release_image::ActiveModel {
        release_id: Set(release.id),
        image_id: Set(image.id),
        r#type: Set(ReleaseImageType::Cover),
    })
    .exec(&conn)
    .await?;
    assert!(
        image::Entity::find_by_id(image.id)
            .one(&conn)
            .await?
            .context("release image disappeared after insertion")?
            .unreferenced_since
            .is_none()
    );

    let reference_removal_started_at = database_clock(&conn).await?;
    release_image::Entity::delete_by_id((release.id, image.id))
        .exec(&conn)
        .await?;
    let reference_removal_finished_at = database_clock(&conn).await?;

    let image = image::Entity::find_by_id(image.id)
        .one(&conn)
        .await?
        .context("release image disappeared")?;
    let unreferenced_since = image.unreferenced_since.context(
        "removing the last release image reference did not start retention",
    )?;
    assert!(
        (reference_removal_started_at..=reference_removal_finished_at)
            .contains(&unreferenced_since)
    );
    Ok(())
}

#[tokio::test]
async fn gc_reclaims_rolled_back_upload_after_retention() -> Result<()> {
    let _gc_guard = GC_TEST_LOCK.lock().await;
    let conn = test_connection().await?;
    let user = MockUser::with_label("image_gc_rollback")
        .insert(&conn)
        .await?;
    let directory = tempfile::tempdir()?;
    let storage = FsStorage::new(directory.path().to_path_buf())?;
    let repository = SeaOrmRepository::new(conn.clone());
    let transaction = repository.begin_tx().await?;
    let service = Service::new(
        transaction.clone(),
        GenericFileStorage::new(storage.clone()),
    );
    let rolled_back_image = service
        .create(
            &png(user.id)?,
            &parser(),
            CreateImageMeta {
                uploaded_by: user.id,
            },
        )
        .await?;
    drop(service);
    transaction.rollback().await?;

    assert!(
        image::Entity::find_by_id(rolled_back_image.id)
            .one(&conn)
            .await?
            .is_none()
    );
    assert!(
        storage
            .last_modified(&rolled_back_image.object_key)
            .await?
            .is_some()
    );
    age_file(directory.path(), &rolled_back_image.object_key, 89)?;
    remove_unreferenced_objects(
        &conn,
        &storage,
        std::slice::from_ref(&rolled_back_image.object_key),
    )
    .await
    .map_err(anyhow::Error::from_boxed)?;
    assert!(
        storage
            .last_modified(&rolled_back_image.object_key)
            .await?
            .is_some()
    );

    age_file(directory.path(), &rolled_back_image.object_key, 91)?;
    collect(&conn, &storage)
        .await
        .map_err(anyhow::Error::from_boxed)?;
    assert!(
        storage
            .last_modified(&rolled_back_image.object_key)
            .await?
            .is_none()
    );
    Ok(())
}

async fn backend_pid<C: sea_orm::ConnectionTrait>(conn: &C) -> Result<i32> {
    conn.query_one(Statement::from_string(
        DatabaseBackend::Postgres,
        "SELECT pg_backend_pid() AS pid",
    ))
    .await?
    .context("transaction backend pid was not returned")?
    .try_get("", "pid")
    .map_err(Into::into)
}

async fn database_clock(
    conn: &sea_orm::DatabaseConnection,
) -> Result<chrono::DateTime<chrono::FixedOffset>> {
    let clock_query = Query::select()
        .expr_as(Func::cust(Alias::new("clock_timestamp")), Alias::new("now"))
        .to_owned();
    let statement = conn.get_database_backend().build(&clock_query);
    conn.query_one(statement)
        .await?
        .context("database time was not returned")?
        .try_get("", "now")
        .map_err(Into::into)
}

async fn wait_until_transaction_is_blocked_by(
    conn: &sea_orm::DatabaseConnection,
    waiting_pid: i32,
    blocking_pid: i32,
) -> Result<()> {
    const WAIT_DEADLINE: Duration = Duration::from_secs(15);
    let statement = Statement::from_sql_and_values(
        DatabaseBackend::Postgres,
        "SELECT 1 WHERE $1 = ANY(pg_blocking_pids($2))",
        [
            Value::Int(Some(blocking_pid)),
            Value::Int(Some(waiting_pid)),
        ],
    );
    let poll = async {
        loop {
            if conn.query_one(statement.clone()).await?.is_some() {
                return Ok::<(), anyhow::Error>(());
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    };
    match tokio::time::timeout(WAIT_DEADLINE, poll).await {
        Ok(result) => result?,
        Err(_) => {
            bail!(
                "transaction {waiting_pid} did not become blocked by transaction {blocking_pid} within {WAIT_DEADLINE:?}"
            );
        }
    }
    Ok(())
}

const CONCURRENT_TEST_CLEANUP_DEADLINE: Duration = Duration::from_secs(5);

#[tokio::test]
async fn gc_skips_upload_in_progress_and_reclaims_other_objects() -> Result<()>
{
    let _gc_guard = GC_TEST_LOCK.lock().await;
    let conn = test_connection().await?;
    let user = MockUser::with_label("image_gc_lock_race")
        .insert(&conn)
        .await?;
    let directory = tempfile::tempdir()?;
    let storage = FsStorage::new(directory.path().to_path_buf())?;
    let bytes = png(user.id)?;
    let initial = upload(&conn, directory.path(), &bytes, user.id).await?;
    age_file(directory.path(), &initial.object_key, 91)?;
    image::Entity::delete_by_id(initial.id).exec(&conn).await?;
    let orphan_object_key = "gc-batch-orphan";
    storage
        .create(orphan_object_key, b"orphan object".to_vec())
        .await?;
    age_file(directory.path(), orphan_object_key, 91)?;

    let holder_repository = SeaOrmRepository::new(conn.clone());
    let holder = holder_repository.begin_tx().await?;
    let service =
        Service::new(holder.clone(), GenericFileStorage::new(storage.clone()));
    let newcomer = service
        .create(
            &bytes,
            &parser(),
            CreateImageMeta {
                uploaded_by: user.id,
            },
        )
        .await?;
    drop(service);

    let object_keys =
        vec![orphan_object_key.to_owned(), initial.object_key.clone()];
    let gc_result = tokio::time::timeout(
        CONCURRENT_TEST_CLEANUP_DEADLINE,
        remove_unreferenced_objects(&conn, &storage, &object_keys),
    )
    .await;
    let holder_result = holder.commit().await;
    holder_result.map_err(anyhow::Error::from)?;
    match gc_result {
        Ok(result) => result.map_err(anyhow::Error::from_boxed)?,
        Err(error) => {
            return Err(error).context(
                "image GC did not finish while the upload transaction was open",
            );
        }
    }

    assert_eq!(newcomer.object_key, initial.object_key);
    assert!(
        image::Entity::find_by_id(newcomer.id)
            .one(&conn)
            .await?
            .is_some()
    );
    assert!(storage.last_modified(&initial.object_key).await?.is_some());
    assert!(storage.last_modified(orphan_object_key).await?.is_none());
    Ok(())
}
