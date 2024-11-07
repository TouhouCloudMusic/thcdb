use fred::prelude::*;

pub struct Service {
    pub pool: RedisPool,
}

impl Service {
    pub async fn init(config: &super::config::Service) -> Self {
        let mut config =
            RedisConfig::from_url(config.redis_url.as_ref()).unwrap();
        config.fail_fast = true;
        let pool = RedisPool::new(config, None, None, None, 6).unwrap();
        pool.init().await.unwrap();

        let pong = pool.ping::<String>().await.unwrap();
        tracing::info!("Connected to redis, {}!", pong);

        Self { pool }
    }

    pub async fn quit(self) -> Result<(), RedisError> {
        self.pool.quit().await
    }

    pub fn pool(&self) -> RedisPool {
        self.pool.clone()
    }
}
