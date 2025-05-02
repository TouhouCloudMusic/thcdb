use std::env;

use nestify::nest;
use serde::Deserialize;

use crate::utils::Pipe;

nest! {
    #[derive(Clone, Deserialize)]*
    pub struct Config {
        pub database_url: String,
        pub redis_url: String,
        pub app: pub struct App {
            pub port: u16,
        },
        pub email: pub struct Email {
            pub creds: pub struct EmailCreds {
                pub username: String,
                pub password: String,
            },
            pub host: String,
        },
        pub middleware: pub struct Middleware {
            pub limit: pub struct LimitMiddleware {
                pub req_per_sec: u64,
                pub burst_size: u32,
            }
        }
    }
}

impl Copy for LimitMiddleware {}

impl Config {
    pub fn init() -> Self {
        config::Config::builder()
            .add_source(config::File::with_name("config"))
            .add_source(config::Environment::default())
            .pipe(|cfg| {
                #[cfg(debug_assertions)]
                let cfg = cfg.add_source(
                    config::File::with_name("config.dev").required(false),
                );

                cfg
            })
            .build()
            .expect("Failed to build config")
            .try_deserialize()
            .expect("Failed to parse config file")
    }
}

#[expect(clippy::expect_fun_call, reason = "run once")]
fn pretty_unwrap_env(key: &str) -> String {
    env::var(key).expect(&format!("Env {key} not set"))
}
