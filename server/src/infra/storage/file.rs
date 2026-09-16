use infra_storage::FsStorage;

use crate::features::image_upload::{AsyncFileStorage, NewStorageObject};
use crate::shared::error::InternalError;

const IMAGE_OBJECT_LOCK_NAMESPACE: i32 = i32::from_be_bytes(*b"\0IMG");

#[derive(Clone)]
pub struct GenericFileStorage {
    fs: FsStorage,
}

impl GenericFileStorage {
    pub const fn new(fs: FsStorage) -> Self {
        Self { fs }
    }
}

impl AsyncFileStorage for GenericFileStorage {
    async fn create(
        &self,
        NewStorageObject { object_key, bytes }: NewStorageObject,
    ) -> Result<(), InternalError> {
        self.fs
            .create(object_key, bytes)
            .await
            .map_err(InternalError::new)
    }
}

/// Serializes publishing and collecting the same object until the transaction ends.
pub(crate) async fn lock_object(
    conn: &sea_orm::DatabaseTransaction,
    object_key: &str,
) -> Result<(), sea_orm::DbErr> {
    use sea_orm::ConnectionTrait;
    use sea_query::{Alias, Expr, Func, Query};

    let query = Query::select()
        .expr(
            Func::cust(Alias::new("pg_advisory_xact_lock")).args([
                Expr::val(IMAGE_OBJECT_LOCK_NAMESPACE).into(),
                Func::cust(Alias::new("hashtext"))
                    .arg(Expr::val(object_key))
                    .into(),
            ]),
        )
        .to_owned();

    conn.execute(conn.get_database_backend().build(&query))
        .await?;

    Ok(())
}

pub(crate) async fn try_lock_objects(
    conn: &sea_orm::DatabaseTransaction,
    object_keys: &[String],
) -> Result<Vec<String>, sea_orm::DbErr> {
    use sea_orm::ConnectionTrait;
    use sea_query::{Alias, Expr, Func, Query};

    let object_locks = Alias::new("object_locks");
    let object_key_column = Alias::new("column1");
    let query = Query::select()
        .expr_as(
            Expr::col((object_locks.clone(), object_key_column.clone())),
            Alias::new("object_key"),
        )
        .from_values(
            object_keys.iter().map(String::as_str),
            object_locks.clone(),
        )
        .and_where(
            Expr::expr(
                Func::cust(Alias::new("pg_try_advisory_xact_lock")).args([
                    Expr::val(IMAGE_OBJECT_LOCK_NAMESPACE).into(),
                    Func::cust(Alias::new("hashtext"))
                        .arg(Expr::col((object_locks, object_key_column)))
                        .into(),
                ]),
            )
            .eq(true),
        )
        .to_owned();

    conn.query_all(conn.get_database_backend().build(&query))
        .await?
        .into_iter()
        .map(|row| row.try_get("", "object_key"))
        .collect()
}
