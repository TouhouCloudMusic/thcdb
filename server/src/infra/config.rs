use flow::Pipe;
use nestify::nest;
use serde::Deserialize;

nest! {
    #[derive(Clone, Deserialize)]*
    pub struct Config {
        pub database_url: String,
        pub redis_url: String,
        pub app: pub struct App {
            pub port: u16,
        },
        pub notification: pub struct Notification {
            #[serde(default = "default_notification_retention_days")]
            pub retention_days: i64,
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

const fn default_notification_retention_days() -> i64 {
    90
}

impl Config {
    pub fn init() -> Self {
        config::Config::builder()
            .add_source(config::File::with_name("config"))
            .add_source(
                config::Environment::with_convert_case(config::Case::Snake)
                    .separator("::"),
            )
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
