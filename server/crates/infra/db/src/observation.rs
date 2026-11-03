use std::future::Future;

use futures_util::TryFutureExt;
use infra_error::OperationContext;
use infra_observability::span::trace;

use crate::error::{DatabaseError, DatabaseFailure};

#[track_caller]
pub fn observe<T, E, F>(
    name: &'static str,
    future: F,
) -> impl Future<Output = Result<T, E>>
where
    F: Future<Output = Result<T, DatabaseFailure>>,
    E: From<DatabaseError>,
{
    let context = OperationContext::new(name);
    trace(
        name,
        future.map_err(move |error| {
            E::from(DatabaseError::attach_context(error, context))
        }),
    )
}
