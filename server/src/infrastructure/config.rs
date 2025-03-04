use std::env;

use serde::Deserialize;

use crate::utils::Pipe;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub app: AppConfig,
    pub email: EmailConfig,
    pub middleware: MiddlewareConfig,
}

#[derive(Clone, Deserialize)]
struct ConfigFile {
    app: AppConfig,
    email: EmailConfig,
    middleware: MiddlewareConfig,
}

#[derive(Clone, Copy, Deserialize)]
pub struct AppConfig {
    pub port: u16,
}

#[derive(Clone, Deserialize)]
pub struct EmailConfig {
    pub creds: EmailCreds,
    pub host: String,
}

#[derive(Clone, Deserialize)]
pub struct EmailCreds {
    pub username: String,
    pub password: String,
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
            .pipe(|x| {
                let cfg = x;

                #[cfg(debug_assertions)]
                let cfg = cfg.add_source(
                    config::File::with_name("config.dev").required(false),
                );

                cfg
            })
            .build()
            .expect("Failed to build config");

        let config: ConfigFile = config.try_deserialize().unwrap();

        Self {
            database_url: env::var("DATABASE_URL").unwrap(),
            redis_url: env::var("REDIS_URL").unwrap(),
            app: config.app,
            email: config.email,
            middleware: config.middleware,
        }
    }
}
