use std::env;

use serde::Deserialize;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub app: AppConfig,
    pub middleware: MiddlewareConfig,
}

#[derive(Clone, Copy, Deserialize)]
struct ConfigFile {
    app: AppConfig,
    middleware: MiddlewareConfig,
}

#[derive(Clone, Copy, Deserialize)]
pub struct AppConfig {
    pub port: u16,
}

#[derive(Clone, Copy, Deserialize)]
pub struct MiddlewareConfig {
    pub limit: LimitMiddlewareConfig,
}

#[derive(Clone, Copy, Deserialize)]
pub struct LimitMiddlewareConfig {
    pub req_per_sec: u64,
    pub burst_size: u32,
}

impl Config {
    pub fn init() -> Self {
        let config = config::Config::builder()
            .add_source(config::File::with_name("config"))
            .build()
            .expect("Failed to build config");

        let config: ConfigFile = config.try_deserialize().unwrap();

        Self {
            database_url: env::var("DATABASE_URL").unwrap(),
            redis_url: env::var("REDIS_URL").unwrap(),
            app: config.app,
            middleware: config.middleware,
        }
    }
}
