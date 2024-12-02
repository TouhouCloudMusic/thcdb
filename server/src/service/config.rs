use std::env;

#[derive(Clone)]
pub struct Service {
    pub database_url: String,
    pub redis_url: String,
    pub server_port: String,
}

impl Service {
    pub fn init() -> Self {
        Self {
            database_url: env::var("DATABASE_URL").unwrap(),
            redis_url: env::var("REDIS_URL").unwrap(),
            server_port: env::var("SERVER_PORT").unwrap(),
        }
    }
}
