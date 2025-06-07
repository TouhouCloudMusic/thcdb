pub mod validation;
pub mod openapi {

    #[derive(Debug)]
    pub enum ContentType {
        Json,
    }

    impl std::fmt::Display for ContentType {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                Self::Json => write!(f, "application/json"),
            }
        }
    }

    impl From<ContentType> for String {
        fn from(val: ContentType) -> Self {
            val.to_string()
        }
    }
}
pub mod traits;
use std::time::Duration;

use tokio::time::sleep;
pub use traits::*;

pub async fn retry_async<F, T, E>(
    delay: Duration,
    retries: u32,
    mut f: F,
) -> Result<T, E>
where
    F: AsyncFnMut() -> Result<T, E>,
{
    let mut attempt = 0;
    loop {
        let result = f().await;
        match result {
            Ok(val) => return Ok(val),
            Err(err) => {
                attempt += 1;
                if attempt > retries {
                    return Err(err);
                }
                sleep(delay).await;
            }
        }
    }
}
