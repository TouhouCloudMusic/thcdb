use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use async_stream::try_stream;
use futures_util::Stream;

#[derive(Clone)]
pub struct FsStorage {
    base_path: PathBuf,
}

#[derive(Clone, Debug)]
pub struct StoredObject {
    pub object_key: String,
    pub last_modified: SystemTime,
}

impl FsStorage {
    pub fn new(base_path: PathBuf) -> Result<Self, std::io::Error> {
        if !std::fs::metadata(&base_path)?.is_dir() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotADirectory,
                format!("{} is not a directory", base_path.display()),
            ));
        }

        Ok(Self { base_path })
    }

    fn prepend_prefix(&self, path: impl AsRef<Path>) -> PathBuf {
        let path = path.as_ref();
        assert!(
            !path.is_absolute(),
            "Path {} is absolute, this should not happen",
            path.display()
        );
        self.base_path.join(path)
    }

    pub async fn create(
        &self,
        path: impl AsRef<Path>,
        data: Vec<u8>,
    ) -> Result<(), std::io::Error> {
        let storage = self.clone();
        let path = path.as_ref().to_owned();
        tokio::task::spawn_blocking(move || {
            let full_path = storage.base_path.join(&path);
            let parent = full_path
                .parent()
                .expect("stored object path must have a parent");

            storage.create_and_sync_directories(
                path.parent()
                    .expect("stored object path must have a parent"),
            )?;

            let mut file = match std::fs::File::open(&full_path) {
                Ok(file) => file,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    match storage.atomic_write(&path, &data) {
                        Ok(()) => return Ok(()),
                        Err(error)
                            if error.kind()
                                == std::io::ErrorKind::AlreadyExists =>
                        {
                            std::fs::File::open(&full_path)?
                        }
                        Err(error) => return Err(error),
                    }
                }
                Err(error) => return Err(error),
            };

            if !file_contents_match(&mut file, &data)? {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::AlreadyExists,
                    "existing file contents differ",
                ));
            }

            std::fs::File::open(parent)?.sync_all()
        })
        .await
        .map_err(std::io::Error::other)?
    }

    fn atomic_write(
        &self,
        path: &Path,
        data: &[u8],
    ) -> Result<(), std::io::Error> {
        let full_path = self.base_path.join(path);
        let parent = full_path
            .parent()
            .expect("stored object path must have a parent");

        let mut temp_file = tempfile::NamedTempFile::new_in(parent)?;
        temp_file.write_all(data)?;
        temp_file.as_file().sync_all()?;

        match temp_file.persist_noclobber(&full_path) {
            Ok(_) => {}
            Err(error) => {
                if error.error.kind() == std::io::ErrorKind::AlreadyExists {
                    error.file.close()?;
                }
                return Err(error.error);
            }
        }

        std::fs::File::open(parent)?.sync_all()
    }

    fn create_and_sync_directories(
        &self,
        dirs: &Path,
    ) -> Result<(), std::io::Error> {
        let mut current = self.base_path.clone();

        for component in dirs.components() {
            current.push(component.as_os_str());
            match std::fs::create_dir(&current) {
                Ok(()) => {}
                Err(error)
                    if error.kind() == std::io::ErrorKind::AlreadyExists =>
                {
                    if !std::fs::metadata(&current)?.is_dir() {
                        return Err(std::io::Error::new(
                            std::io::ErrorKind::NotADirectory,
                            format!(
                                "{} is already exists but not a directory",
                                current.display()
                            ),
                        ));
                    }
                }
                Err(error) => return Err(error),
            }

            std::fs::File::open(
                current
                    .parent()
                    .expect("stored object parent must have a parent"),
            )?
            .sync_all()?;
        }

        Ok(())
    }

    pub fn list(
        &self,
    ) -> impl Stream<Item = Result<StoredObject, std::io::Error>> + '_ {
        try_stream! {
            let mut directory_stack = {
                let root_directory = tokio::fs::read_dir(&self.base_path).await?;
                vec![root_directory]
            };

            while let Some(directory) = directory_stack.last_mut() {
                let Some(entry) = directory.next_entry().await? else {
                    directory_stack.pop();
                    continue;
                };

                let metadata = match entry.metadata().await {
                    Ok(metadata) => metadata,
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                    Err(error) => Err(error)?,
                };

                if metadata.is_dir() {
                    directory_stack.push(tokio::fs::read_dir(entry.path()).await?);
                    continue;
                }

                if !metadata.is_file() {
                    continue;
                }

                let relative_path = entry
                    .path()
                    .strip_prefix(&self.base_path)
                    .expect("listed file must be under the storage root")
                    .to_owned();
                let Some(object_key) = relative_path.to_str() else {
                    log::warn!(
                        target: "infra.storage",
                        path:? = relative_path;
                        "skipped stored object with a non-UTF-8 key"
                    );
                    continue;
                };

                yield StoredObject {
                    object_key: object_key.to_owned(),
                    last_modified: metadata.modified()?,
                };
            }
        }
    }

    pub async fn last_modified(
        &self,
        path: impl AsRef<Path>,
    ) -> Result<Option<SystemTime>, std::io::Error> {
        let full_path = self.base_path.join(path.as_ref());
        tokio::task::spawn_blocking(move || {
            match std::fs::symlink_metadata(full_path) {
                Ok(metadata) if metadata.file_type().is_file() => {
                    Ok(Some(metadata.modified()?))
                }
                Ok(_) => Ok(None),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    Ok(None)
                }
                Err(error) => Err(error),
            }
        })
        .await
        .map_err(std::io::Error::other)?
    }

    pub fn remove(
        &self,
        path: impl AsRef<std::path::Path>,
    ) -> Result<(), std::io::Error> {
        let path = self.prepend_prefix(path);
        remove_file(&path)
    }
}

fn file_contents_match(
    file: &mut std::fs::File,
    data: &[u8],
) -> Result<bool, std::io::Error> {
    const CONTENT_COMPARE_BUFFER_SIZE: usize = 128 * 1024;

    if file.metadata()?.len() != data.len() as u64 {
        return Ok(false);
    }

    let mut remaining = data;
    let mut buffer = vec![0; CONTENT_COMPARE_BUFFER_SIZE].into_boxed_slice();

    loop {
        let len = match file.read(&mut buffer) {
            Ok(len) => len,
            // Interrupted can be retried.
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => {
                continue;
            }
            Err(error) => return Err(error),
        };

        if len == 0 {
            return Ok(remaining.is_empty());
        }

        let Some(rest) = remaining.strip_prefix(&buffer[..len]) else {
            return Ok(false);
        };

        remaining = rest;
    }
}

// Keep deletion synchronous so cancellation can't release the GC transaction lock before the shared file is fully deleted.
fn remove_file(path: &Path) -> Result<(), std::io::Error> {
    let res = std::fs::remove_file(path).inspect_err(|e| {
        log::error!(
            target: "infra.storage",
            path:% = path.display(),
            error:% = e;
            "failed to remove file"
        );
    });

    match res {
        Ok(()) => Ok(()),
        Err(e) => match e.kind() {
            // If the file does not exist, it is already removed
            std::io::ErrorKind::NotFound => Ok(()),
            _ => Err(e),
        },
    }
}

#[cfg(test)]
mod test {
    use std::path::{Path, PathBuf};

    use futures_util::StreamExt;

    struct TestFsContext {
        root: tempfile::TempDir,
    }

    impl TestFsContext {
        fn new() -> anyhow::Result<Self> {
            Ok(Self {
                root: tempfile::tempdir()?,
            })
        }

        fn path(&self, path: impl AsRef<Path>) -> PathBuf {
            self.root.path().join(path)
        }

        fn storage(&self, scope: &str) -> anyhow::Result<super::FsStorage> {
            let storage_path = self.path(scope);
            std::fs::create_dir(&storage_path)?;
            Ok(super::FsStorage::new(storage_path)?)
        }
    }

    mod delete {
        use super::TestFsContext;

        #[test]
        fn panics_with_an_absolute_path() -> anyhow::Result<()> {
            let context = TestFsContext::new()?;
            let storage = context.storage("storage")?;
            let external_file = context.path("external");
            std::fs::write(&external_file, b"external")?;

            let result =
                std::panic::catch_unwind(|| storage.remove(&external_file));

            assert!(result.is_err());
            assert!(external_file.try_exists()?);
            Ok(())
        }

        #[test]
        fn succeeds_for_a_missing_object() -> anyhow::Result<()> {
            let context = TestFsContext::new()?;
            let storage = context.storage("storage")?;

            storage.remove("nested/missing")?;

            Ok(())
        }
    }

    mod construct {
        use super::super::FsStorage;
        use super::TestFsContext;

        #[test]
        fn with_a_missing_root_fails_without_creating_directories()
        -> anyhow::Result<()> {
            let context = TestFsContext::new()?;
            let storage_path = context.path("missing/storage");

            let Err(error) = FsStorage::new(storage_path) else {
                anyhow::bail!(
                    "constructing storage with a missing root succeeded"
                );
            };

            assert_eq!(error.kind(), std::io::ErrorKind::NotFound);
            assert!(!context.path("missing").try_exists()?);
            Ok(())
        }

        #[test]
        fn with_a_file_as_root_fails() -> anyhow::Result<()> {
            let context = TestFsContext::new()?;
            let storage_path = context.path("storage");
            std::fs::write(&storage_path, b"file")?;

            assert!(FsStorage::new(storage_path).is_err());
            Ok(())
        }
    }

    mod create {
        use super::TestFsContext;

        #[tokio::test]
        async fn with_the_same_key_and_identical_contents_succeeds()
        -> anyhow::Result<()> {
            let context = TestFsContext::new()?;
            let storage = context.storage("storage")?;
            let data = vec![b'a'; 128 * 1024 + 1];

            storage.create("ab/cd/shared", data.clone()).await?;
            storage.create("ab/cd/shared", data.clone()).await?;

            assert_eq!(
                std::fs::read(context.path("storage/ab/cd/shared"))?,
                data
            );

            Ok(())
        }

        #[tokio::test]
        async fn with_the_same_key_and_different_contents_fails()
        -> anyhow::Result<()> {
            let context = TestFsContext::new()?;
            let storage = context.storage("storage")?;
            let old_data = vec![b'a'; 128 * 1024 + 1];
            let mut new_data = old_data.clone();
            *new_data.last_mut().expect("test data must not be empty") = b'b';

            storage.create("shared", old_data.clone()).await?;
            assert!(storage.create("shared", new_data).await.is_err());

            assert_eq!(
                std::fs::read(context.path("storage/shared"))?,
                old_data
            );

            Ok(())
        }
    }

    #[tokio::test]
    async fn listing_fails_when_the_storage_root_is_missing()
    -> anyhow::Result<()> {
        let context = TestFsContext::new()?;
        let storage = context.storage("storage")?;
        std::fs::remove_dir(context.path("storage"))?;

        let mut objects = std::pin::pin!(storage.list());
        let Some(Err(error)) = objects.next().await else {
            anyhow::bail!("listing a missing storage root produced no error");
        };
        assert_eq!(error.kind(), std::io::ErrorKind::NotFound);
        Ok(())
    }

    #[tokio::test]
    async fn modification_time_is_none_for_a_missing_object()
    -> anyhow::Result<()> {
        let context = TestFsContext::new()?;
        let storage = context.storage("storage")?;

        assert!(storage.last_modified("nested/missing").await?.is_none());

        Ok(())
    }
}
