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

pub trait FutureExt: Future + Sized {
    async fn await_if(self, cond: bool) -> Option<Self::Output> {
        if cond { Some(self.await) } else { None }
    }

    async fn await_or(self, cond: bool, default: Self::Output) -> Self::Output {
        if cond { self.await } else { default }
    }

    async fn await_or_else(
        self,
        cond: bool,
        f: impl FnOnce() -> Self::Output,
    ) -> Self::Output {
        if cond { self.await } else { f() }
    }

    async fn await_or_default(self, cond: bool) -> Self::Output
    where
        Self::Output: Default,
    {
        if cond {
            self.await
        } else {
            Self::Output::default()
        }
    }
}

impl<T> FutureExt for T where T: Future {}
