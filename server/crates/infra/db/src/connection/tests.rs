use std::error::Error;
use std::future::{Future, ready};
use std::task::{Context, Poll, Waker};

use infra_error::BoxedError;
use sea_orm::DbErr;

use crate::error::DatabaseError;

#[crate::observe("test.attribute.failure", crate = crate)]
async fn attributed_failure() -> Result<(), crate::error::DatabaseError> {
    Err::<(), _>(DbErr::Custom("attribute database unavailable".into()))?;
    Ok(())
}

#[test]
fn attributed_delegation_constructs_the_future_before_polling() {
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn prepare(
        constructed: &AtomicUsize,
    ) -> impl Future<Output = Result<(), DbErr>> + Send {
        constructed.fetch_add(1, Ordering::Relaxed);
        ready(Ok(()))
    }

    #[crate::observe("test.attribute.delegate", crate = crate)]
    fn delegated(
        constructed: &AtomicUsize,
    ) -> impl Future<Output = Result<(), crate::error::DatabaseError>> + Send
    {
        prepare(constructed)
    }

    let constructed = AtomicUsize::new(0);
    let mut future = std::pin::pin!(delegated(&constructed));
    assert_eq!(constructed.load(Ordering::Relaxed), 1);
    assert!(matches!(
        future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop())),
        Poll::Ready(Ok(()))
    ));
    assert_eq!(constructed.load(Ordering::Relaxed), 1);
}

#[test]
fn delegated_failures_keep_the_source_file() {
    #[crate::observe("test.attribute.delegated_failure", crate = crate)]
    fn delegated_failure() -> impl Future<Output = Result<(), DatabaseError>> {
        ready(Err::<(), _>(DbErr::Custom("database unavailable".into())))
    }

    let mut future = std::pin::pin!(delegated_failure());
    let Poll::Ready(Err(error)) = future
        .as_mut()
        .poll(&mut Context::from_waker(Waker::noop()))
    else {
        panic!("the delegated database failure should complete");
    };
    assert!(
        error
            .to_string()
            .contains(&format!("origin at {}:", file!()))
    );
}

#[test]
fn nested_failures_keep_each_operation_and_the_original_cause()
-> Result<(), BoxedError> {
    #[crate::observe("test.helper", crate = crate)]
    async fn helper() -> Result<(), DatabaseError> {
        attributed_failure().await?;
        Ok(())
    }

    #[crate::observe("test.repo", crate = crate)]
    async fn repo() -> Result<(), DatabaseError> {
        helper().await?;
        Ok(())
    }

    let mut repo = std::pin::pin!(repo());

    let Poll::Ready(Err(error)) =
        repo.as_mut().poll(&mut Context::from_waker(Waker::noop()))
    else {
        panic!("the ready database failure should complete");
    };

    let message = error.to_string();
    let repo = message
        .find(&format!("test.repo at {}:", file!()))
        .ok_or("missing repo call site")?;
    let helper = message
        .find(&format!("test.helper at {}:", file!()))
        .ok_or("missing helper call site")?;
    let step = message
        .find(&format!("test.attribute.failure at {}:", file!()))
        .ok_or("missing failing operation call site")?;
    let origin = message
        .find(&format!("origin at {}:", file!()))
        .ok_or("missing error origin")?;
    assert!(repo < helper && helper < step && step < origin);

    let mut source: &(dyn Error + 'static) = &error;
    while let Some(cause) = source.source() {
        source = cause;
    }
    assert!(
        matches!(source.downcast_ref::<DbErr>(), Some(DbErr::Custom(message)) if message == "attribute database unavailable")
    );
    Ok(())
}
