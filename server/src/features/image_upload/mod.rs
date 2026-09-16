use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use domain::image::Image;
use entity::enums::StorageBackend;
use infra_db::SeaOrmTxRepo;
use libfp::FunctorExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use xxhash_rust::xxh3::xxh3_128;

use crate::infra::database::error::DatabaseResultExt;
use crate::infra::storage::file::lock_object;
use crate::shared::error::InternalError;

mod parser;

pub use parser::*;

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

#[derive(Clone, Debug)]
pub struct NewStorageObject {
    pub object_key: String,
    pub bytes: Vec<u8>,
}

pub trait AsyncFileStorage: Send + Sync {
    /// Publishes the complete object, reusing an existing object only when its bytes match.
    async fn create(
        &self,
        object: NewStorageObject,
    ) -> Result<(), InternalError>;
}

pub struct CreateImageMeta {
    pub uploaded_by: i32,
}

#[derive(Clone, bon::Builder)]
pub struct Service<S> {
    tx: SeaOrmTxRepo,
    storage: S,
}

impl<S> Service<S> {
    pub const fn new(tx: SeaOrmTxRepo, storage: S) -> Self {
        Self { tx, storage }
    }
}

impl<Storage: AsyncFileStorage> Service<Storage> {
    pub async fn create(
        &self,
        bytes: &[u8],
        parser: &Parser,
        meta: CreateImageMeta,
    ) -> Result<Image, CreateError> {
        let parsed = parser.parse(bytes)?;
        let hash = BASE64_URL_SAFE_NO_PAD
            .encode(xxh3_128(&parsed.bytes).to_be_bytes());
        let object_key = format!(
            "{}/{}/{}.{}",
            &hash[..2],
            &hash[2..4],
            hash,
            parsed.extension
        );
        let backend = StorageBackend::Fs;

        lock_object(self.tx.conn(), &object_key)
            .await
            .db_operation("lock uploaded image object")?;
        self.storage
            .create(NewStorageObject {
                object_key: object_key.clone(),
                bytes: parsed.bytes,
            })
            .await?;

        entity::image::Entity::insert(entity::image::ActiveModel {
            id: NotSet,
            uploaded_by: Set(meta.uploaded_by),
            uploaded_at: NotSet,
            backend: Set(backend),
            object_key: Set(object_key),
            unreferenced_since: NotSet,
        })
        .exec_with_returning(self.tx.conn())
        .await
        .db_operation("create image upload")
        .fmap_into()
        .map_err(Into::into)
    }
}
