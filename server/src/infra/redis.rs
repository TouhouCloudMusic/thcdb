use fred::prelude::{ClientLike, Config, Error, Pool as RedisPool};

#[derive(Clone)]
pub struct Pool {
    inner: RedisPool,
}

impl Pool {
    pub async fn init(url: &str) -> Self {
        let mut config = Config::from_url(url).unwrap();
        config.fail_fast = true;
        let pool = RedisPool::new(config, None, None, None, 6).unwrap();
        pool.init().await.unwrap();

        let pong: String = pool.ping(None).await.unwrap();
        tracing::info!("Connected to redis, {}!", pong);

        Self { inner: pool }
    }

    pub async fn quit(self) -> Result<(), Error> {
        self.inner.quit().await
    }

    pub fn pool(&self) -> RedisPool {
        self.inner.clone()
    }
}
