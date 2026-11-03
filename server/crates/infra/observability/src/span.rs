use std::borrow::Cow;
use std::future::Future;

use fastrace::future::FutureExt as _;
use fastrace::local::LocalSpan;
use futures_util::FutureExt as _;

#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq, strum::IntoStaticStr)]
#[strum(serialize_all = "snake_case")]
pub(super) enum OperationOutcome {
    Succeeded,
    Failed,
}

pub fn record_outcome(label: &'static str) {
    LocalSpan::add_property(|| ("outcome", label));
}

pub fn record_error(error_type: Option<Cow<'static, str>>) {
    LocalSpan::add_property(|| ("span.status_code", "error"));
    if let Some(error_type) = error_type {
        LocalSpan::add_property(|| ("error.type", error_type));
    }
}

pub(super) fn record_operation_result<T, E>(
    result: &Result<T, E>,
) -> OperationOutcome {
    let outcome = match result {
        Ok(_) => OperationOutcome::Succeeded,
        Err(_) => OperationOutcome::Failed,
    };
    record_outcome(outcome.into());
    if outcome == OperationOutcome::Failed {
        record_error(Some(std::any::type_name::<E>().into()));
    }
    outcome
}

pub fn trace<T, E, F>(
    name: &'static str,
    future: F,
) -> impl Future<Output = Result<T, E>>
where
    F: Future<Output = Result<T, E>>,
{
    future
        .inspect(|result| {
            record_operation_result(result);
        })
        .in_span(fastrace::Span::enter_with_local_parent(name))
}
