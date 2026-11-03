use std::task::{Context, Poll};
use std::time::Instant;

use apalis::prelude::{Context as WorkerContext, Worker};
use fastrace::future::FutureExt as _;
use fastrace::prelude::{Span, SpanContext};
use futures_util::FutureExt as _;
use futures_util::future::BoxFuture;
use infra_observability::span;
use infra_observability::worker::observe_worker;
use tower::{Layer, Service};

use crate::{Error, Request, TaskId, TaskOutcome};

enum WorkerOutcome {
    Succeeded,
    Skipped,
    Failed,
}

impl WorkerOutcome {
    const fn as_str(&self) -> &'static str {
        match self {
            Self::Succeeded => "succeeded",
            Self::Skipped => "skipped",
            Self::Failed => "failed",
        }
    }
}

fn record_outcome(result: &Result<TaskOutcome, Error>) -> &'static str {
    let outcome = match result {
        Ok(TaskOutcome::Completed) => WorkerOutcome::Succeeded,
        Ok(TaskOutcome::Skipped) => WorkerOutcome::Skipped,
        Ok(TaskOutcome::Discarded) | Err(_) => WorkerOutcome::Failed,
    };
    let label = outcome.as_str();
    span::record_outcome(label);
    if matches!(outcome, WorkerOutcome::Failed) {
        span::record_error(None);
    }
    label
}

fn worker_span_properties(
    name: &str,
    task_id: &TaskId,
) -> [(&'static str, String); 3] {
    [
        ("span.kind", "consumer".to_owned()),
        ("job.name", name.to_owned()),
        ("task.id", task_id.to_string()),
    ]
}

/// Observe one backend delivery, including Apalis retry delays.
/// Install outside the retry layer; completion describes the service result,
/// before the backend acknowledges it.
#[derive(Clone, Copy)]
pub struct RunLayer;

impl<S> Layer<S> for RunLayer {
    type Service = RunService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RunService { inner }
    }
}

#[derive(Clone)]
pub struct RunService<S> {
    inner: S,
}

impl<S, T, C> Service<Request<T, C>> for RunService<S>
where
    S: Service<Request<T, C>, Response = TaskOutcome, Error = Error>,
    S::Future: Send + 'static,
{
    type Response = TaskOutcome;
    type Error = Error;
    type Future = BoxFuture<'static, Result<TaskOutcome, Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request<T, C>) -> Self::Future {
        let worker =
            match request.parts.data.get_checked::<Worker<WorkerContext>>() {
                Ok(worker) => worker,
                Err(error) => return std::future::ready(Err(error)).boxed(),
            };
        let name = worker.id().name();
        let span = Span::root(format!("worker.{name}"), SpanContext::random())
            .with_properties(|| {
                worker_span_properties(name, &request.parts.task_id)
            });
        let future = {
            let _parent = span.set_local_parent();
            self.inner.call(request)
        };
        future
            .inspect(|result| {
                record_outcome(result);
            })
            .in_span(span)
            .boxed()
    }
}

/// Observe each handler execution. Install inside the retry layer.
pub struct AttemptLayer<T, Fields = NoFields> {
    fields: Option<fn(&T) -> Fields>,
}

impl<T, Fields> Clone for AttemptLayer<T, Fields> {
    fn clone(&self) -> Self {
        *self
    }
}

impl<T, Fields> Copy for AttemptLayer<T, Fields> {}

pub type NoFields = [(&'static str, &'static str); 0];

impl<T> AttemptLayer<T> {
    pub const fn new() -> Self {
        Self { fields: None }
    }
}

impl<T> Default for AttemptLayer<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T, Fields> AttemptLayer<T, Fields> {
    pub const fn with_fields(fields: fn(&T) -> Fields) -> Self {
        Self {
            fields: Some(fields),
        }
    }
}

impl<S, T, Fields> Layer<S> for AttemptLayer<T, Fields> {
    type Service = AttemptService<S, T, Fields>;

    fn layer(&self, inner: S) -> Self::Service {
        AttemptService {
            inner,
            fields: self.fields,
        }
    }
}

pub struct AttemptService<S, T, Fields> {
    inner: S,
    fields: Option<fn(&T) -> Fields>,
}

impl<S: Clone, T, Fields> Clone for AttemptService<S, T, Fields> {
    fn clone(&self) -> Self {
        Self {
            inner: self.inner.clone(),
            fields: self.fields,
        }
    }
}

impl<S, T, C, Fields> Service<Request<T, C>> for AttemptService<S, T, Fields>
where
    Fields: log::kv::Source + Send + 'static,
    S: Service<Request<T, C>, Response = TaskOutcome, Error = Error>,
    S::Future: Send + 'static,
{
    type Response = TaskOutcome;
    type Error = Error;
    type Future = BoxFuture<'static, Result<TaskOutcome, Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request<T, C>) -> Self::Future {
        let fields = self.fields.map(|extract| extract(&request.args));
        let task_id = request.parts.task_id.to_string();
        let attempt = request.parts.attempt.current();
        let name =
            match request.parts.data.get_checked::<Worker<WorkerContext>>() {
                Ok(worker) => worker.id().name().to_owned(),
                Err(error) => return std::future::ready(Err(error)).boxed(),
            };
        let span =
            Span::enter_with_local_parent(format!("worker.{name}.attempt"))
                .with_properties(|| {
                    worker_span_properties(&name, &request.parts.task_id)
                })
                .with_property(|| ("attempt", attempt.to_string()));
        let future = {
            let _parent = span.set_local_parent();
            self.inner.call(request)
        };
        async move {
            let started = Instant::now();
            let result = future.await;
            if let Err(error) = &result
                && log::log_enabled!(target: "infra.worker", log::Level::Error)
            {
                let error = match error {
                    Error::ServiceError(_) | Error::SourceError(_) => {
                        log::kv::Value::from_debug(error)
                    }
                    _ => log::kv::Value::from_display(error),
                };
                let base = [
                    ("job", log::kv::Value::from(name.as_str())),
                    ("task_id", log::kv::Value::from(task_id.as_str())),
                    ("attempt", log::kv::Value::from(attempt)),
                    ("error", error),
                ];
                let fields = [&base as &dyn log::kv::Source, &fields];
                log::logger().log(
                    &log::Record::builder()
                        .args(format_args!("worker attempt failed"))
                        .level(log::Level::Error)
                        .target("infra.worker")
                        .module_path(Some(module_path!()))
                        .file(Some(file!()))
                        .line(Some(line!()))
                        .key_values(&fields)
                        .build(),
                );
            }
            let outcome = record_outcome(&result);
            observe_worker(&name, outcome, started.elapsed());
            result
        }
        .in_span(span)
        .boxed()
    }
}
