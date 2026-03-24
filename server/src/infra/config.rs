use flow::Pipe;
use nestify::nest;
use serde::Deserialize;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EmailSecurity {
    Smtps,
    Starttls,
}

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
            #[serde(default = "default_email_port")]
            pub port: u16,
            #[serde(default = "default_email_security")]
            pub security: EmailSecurity,
            pub from: String,
        },
        pub middleware: pub struct Middleware {
            #[serde(default = "default_session_secure")]
            pub session_secure: bool,
            pub limit: pub struct LimitMiddleware {
                pub req_per_sec: u64,
                pub burst_size: u32,
                #[serde(default)]
                pub pre_auth: pub struct PreAuthLimitMiddleware {
                    #[serde(default = "default_pre_auth_req_per_sec")]
                    pub req_per_sec: u64,
                    #[serde(default = "default_pre_auth_burst_size")]
                    pub burst_size: u32,
                }
            }
        }
    }
}

impl Copy for LimitMiddleware {}
impl Copy for PreAuthLimitMiddleware {}

impl Default for PreAuthLimitMiddleware {
    fn default() -> Self {
        Self {
            req_per_sec: default_pre_auth_req_per_sec(),
            burst_size: default_pre_auth_burst_size(),
        }
    }
}

const fn default_notification_retention_days() -> i64 {
    90
}

const fn default_email_port() -> u16 {
    587
}

const fn default_email_security() -> EmailSecurity {
    EmailSecurity::Starttls
}

const fn default_session_secure() -> bool {
    true
}

const fn default_pre_auth_req_per_sec() -> u64 {
    20
}

const fn default_pre_auth_burst_size() -> u32 {
    32
}

impl Config {
    pub fn init() -> Self {
        config::Config::builder()
            .add_source(config::File::with_name("config"))
            .add_source(
                config::Environment::with_convert_case(config::Case::Snake)
                    .separator("__"),
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
