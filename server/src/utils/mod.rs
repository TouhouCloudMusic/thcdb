pub mod openapi;
pub mod validation;

use std::time::Duration;

use tokio::time::sleep;

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
