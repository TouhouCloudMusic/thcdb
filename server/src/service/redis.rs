use fred::prelude::*;

#[derive(Clone)]
pub struct Service {
    pub pool: Pool,
}

impl Service {
    pub async fn init(config: &super::config::Service) -> Self {
        let mut config = Config::from_url(config.redis_url.as_ref()).unwrap();
        config.fail_fast = true;
        let pool = Pool::new(config, None, None, None, 6).unwrap();
        pool.init().await.unwrap();

        let pong: String = pool.ping(None).await.unwrap();
        tracing::info!("Connected to redis, {}!", pong);

        Self { pool }
    }

    pub async fn quit(self) -> Result<(), Error> {
        self.pool.quit().await
    }

    pub fn pool(&self) -> Pool {
        self.pool.clone()
    }
}
