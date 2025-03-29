use axum::Router;
use axum::routing::get;

pub const PUBLIC_DIR: &str = "public";
pub const IMAGE_DIR: &str = "image";

pub const ADMIN_USERNAME: &str = "Admin";

pub mod share {
    pub const AVATAR_MAX_SIZE: u32 = 10 * 1024 * 1024;
    pub const AVATAR_MIN_SIZE: u32 = 1024;
}

mod r#gen {
    include!("constant/gen.rs");
}

pub fn router() -> Router {
    Router::new()
        .route("/constant.ts", get(async || r#gen::TS_CONSTANTS))
        .route("/constant.kt", get(async || r#gen::KT_CONSTANTS))
}
