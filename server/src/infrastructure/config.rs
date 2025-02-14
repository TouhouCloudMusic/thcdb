use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub server_port: String,
    pub req_per_sec: u64,
    pub req_burst_size: u32,
}

impl Config {
    pub fn init() -> Self {
        Self {
            database_url: env::var("DATABASE_URL").unwrap(),
            redis_url: env::var("REDIS_URL").unwrap(),
            server_port: env::var("SERVER_PORT").unwrap(),
            req_per_sec: env::var("REQ_PER_SEC")
                .map(|s| s.parse().unwrap())
                .unwrap_or(10),
            req_burst_size: env::var("REQ_BURST_SIZE")
                .map(|s| s.parse().unwrap())
                .unwrap_or(10),
        }
    }
}
