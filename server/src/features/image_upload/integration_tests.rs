use std::path::Path;

use anyhow::Result;
use bytesize::ByteSize;
use futures_util::TryStreamExt;
use infra_db::SeaOrmRepository;
use infra_storage::FsStorage;

use super::{CreateImageMeta, ParseOption, Parser, Service};
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::test_connection;
use crate::infra::storage::GenericFileStorage;

fn parser() -> Parser {
    ParseOption::builder()
        .valid_formats(&[::image::ImageFormat::Png])
        .file_size_range(ByteSize::b(1)..=ByteSize::mib(1))
        .size_range(1..=32_768)
        .build()
        .into_parser()
}

fn png(seed: i32, variant: u8) -> Result<Vec<u8>> {
    use ::image::codecs::png::PngEncoder;
    use ::image::{ColorType, ImageEncoder};

    let seed = seed.to_le_bytes();
    let mut bytes = Vec::new();
    PngEncoder::new(&mut bytes).write_image(
        &[
            seed[0], variant, 0, seed[1], 255, 0, seed[2], 0, 255, seed[3],
            255, 255,
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
    source: &[u8],
    parser: &Parser,
    uploaded_by: i32,
) -> Result<domain::image::Image> {
    let repository = SeaOrmRepository::new(conn.clone());
    let transaction = repository.begin_tx().await?;
    let storage =
        GenericFileStorage::new(FsStorage::new(base_path.to_path_buf())?);
    let service = Service::new(transaction.clone(), storage);
    let image = service
        .create(source, parser, CreateImageMeta { uploaded_by })
        .await?;
    drop(service);
    transaction.commit().await?;
    Ok(image)
}

#[tokio::test]
async fn same_content_creates_new_image_record_but_reuses_storage_object()
-> Result<()> {
    let conn = test_connection().await?;
    let first_user = MockUser::with_label("shared_image_first")
        .insert(&conn)
        .await?;
    let second_user = MockUser::with_label("shared_image_second")
        .insert(&conn)
        .await?;
    let directory = tempfile::tempdir()?;
    let storage = FsStorage::new(directory.path().to_path_buf())?;
    let source = png(first_user.id, 0)?;
    let parser = parser();
    let parsed = parser.parse(&source)?;
    let first =
        upload(&conn, directory.path(), &source, &parser, first_user.id)
            .await?;
    let second =
        upload(&conn, directory.path(), &source, &parser, first_user.id)
            .await?;
    let third =
        upload(&conn, directory.path(), &source, &parser, second_user.id)
            .await?;

    assert_ne!(first.id, second.id);
    assert_ne!(first.id, third.id);
    assert_ne!(second.id, third.id);
    assert_eq!(first.object_key, second.object_key);
    assert_eq!(first.object_key, third.object_key);
    assert_eq!(first.uploaded_by, first_user.id);
    assert_eq!(second.uploaded_by, first_user.id);
    assert_eq!(third.uploaded_by, second_user.id);

    let files: Vec<_> = storage.list().try_collect().await?;
    assert_eq!(files.len(), 1);
    assert_eq!(files[0].object_key, first.object_key);
    let stored = std::fs::read(directory.path().join(&first.object_key))?;
    assert_eq!(stored, parsed.bytes);
    Ok(())
}

#[tokio::test]
async fn different_content_creates_new_storage_object() -> Result<()> {
    let conn = test_connection().await?;
    let uploader = MockUser::with_label("distinct_image_contents")
        .insert(&conn)
        .await?;
    let directory = tempfile::tempdir()?;
    let storage = FsStorage::new(directory.path().to_path_buf())?;
    let parser = parser();
    let first_source = png(uploader.id, 0)?;
    let second_source = png(uploader.id, 1)?;

    let first =
        upload(&conn, directory.path(), &first_source, &parser, uploader.id)
            .await?;
    let second = upload(
        &conn,
        directory.path(),
        &second_source,
        &parser,
        uploader.id,
    )
    .await?;

    assert_ne!(first.object_key, second.object_key);
    let files: Vec<_> = storage.list().try_collect().await?;
    assert_eq!(files.len(), 2);
    Ok(())
}
