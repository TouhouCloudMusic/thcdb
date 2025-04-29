use axum::Router;
use axum::routing::get;

#[rustfmt::skip]
mod r#gen;

pub const PUBLIC_DIR: &str = "public";
pub const IMAGE_DIR: &str = "image";

pub const ADMIN_USERNAME: &str = "Admin";

pub use share::*;

mod share {
    // Artist

    pub const ARTIST_PROFILE_IMAGE_MIN_WIDTH: u32 = 256;
    pub const ARTIST_PROFILE_IMAGE_MAX_WIDTH: u32 = 4096;
    pub const ARTIST_PROFILE_IMAGE_MIN_HEIGHT: u32 = 256;
    pub const ARTIST_PROFILE_IMAGE_MAX_HEIGHT: u32 = 4096;
    pub const ARTIST_PROFILE_IMAGE_RATIO_MIN: f64 = 1.0;
    pub const ARTIST_PROFILE_IMAGE_RATIO_MAX: f64 = 2.0;

    // User
    pub const AVATAR_MAX_SIZE: u32 = 10 * 1024 * 1024;
    pub const AVATAR_MIN_SIZE: u32 = 1024;

    pub const USER_PROFILE_BANNER_MAX_WIDTH: u32 = 1500;
    pub const USER_PROFILE_BANNER_MIN_WIDTH: u32 = 600;
    pub const USER_PROFILE_BANNER_MAX_HEIGHT: u32 = 500;
    pub const USER_PROFILE_BANNER_MIN_HEIGHT: u32 = 200;

    // Note: if you modify these values, please also change the regexes below
    pub const USER_NAME_MIN_LENGTH: u8 = 1;
    pub const USER_NAME_MAX_LENGTH: u8 = 64;
    pub const USER_NAME_REGEX_STR: &str = r"^[\p{L}\p{N}_]{1,64}$";
    pub const USER_PASSWORD_MIN_LENGTH: u8 = 8;
    pub const USER_PASSWORD_MAX_LENGTH: u8 = 64;
    pub const USER_PASSWORD_REGEX_STR: &str =
        r"^[A-Za-z\d`~!@#$%^&*()\-_=+]{8,64}$";
}

pub fn router() -> Router {
    Router::new()
        .route("/constant.ts", get(async || r#gen::TS_CONSTANTS.clone()))
        .route("/constant.kt", get(async || r#gen::KT_CONSTANTS.clone()))
}
