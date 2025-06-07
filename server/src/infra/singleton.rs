use std::path::PathBuf;
use std::sync::LazyLock;

use argon2::Argon2;

use super::config::Config;
use crate::constant::{IMAGE_DIR, PUBLIC_DIR};

pub static APP_CONFIG: LazyLock<Config> = LazyLock::new(Config::init);

pub static ARGON2_HASHER: LazyLock<Argon2> = LazyLock::new(Argon2::default);

pub static FS_IMAGE_BASE_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]));
