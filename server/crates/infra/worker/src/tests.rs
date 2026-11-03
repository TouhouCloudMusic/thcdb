use std::collections::BTreeSet;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, OnceLock};
use std::task::{Context, Waker};
use std::time::Duration;

use apalis::layers::retry::backoff::{ExponentialBackoffMaker, MakeBackoff};
use apalis::layers::retry::{HasherRng, RetryLayer, RetryPolicy};
use apalis::prelude::{
    Context as WorkerContext, MemoryStorage, MessageQueue, WorkerId,
};
use fastrace::collector::{Config, SpanId, SpanRecord, TestReporter};
use fastrace::prelude::Span;
use infra_error::BoxedError;
use tower::{Service, ServiceBuilder, service_fn};

use crate::{
    Attempt, AttemptLayer, Error, Monitor, Request, RunLayer, TaskOutcome,
    Worker, WorkerBuilder, WorkerFactoryFn, permanent_error,
    report_backend_error, retryable_error,
};

fn reporter() -> &'static TestReporter {
    static REPORTER: OnceLock<TestReporter> = OnceLock::new();
    REPORTER.get_or_init(|| {
        logforth::starter_log::builder()
            .dispatch(|dispatch| {
                dispatch
                    .filter(logforth::record::LevelFilter::All)
                    .diagnostic(
                        logforth::diagnostic::FastraceDiagnostic::default(),
                    )
                    .append(logforth::append::FastraceEvent::default())
            })
            .apply();
        let (reporter, _) = TestReporter::new();
        fastrace::set_reporter(
            TestReporter {
                spans: reporter.spans.clone(),
            },
            Config::default(),
        );
        reporter
    })
}

fn records(job: &str) -> Vec<SpanRecord> {
    fastrace::flush();
    reporter()
        .spans
        .lock()
        .iter()
        .filter(|span| property(span, "job.name") == Some(job))
        .cloned()
        .collect()
}

fn assert_error_reports(job: &str, expected: usize) {
    let records = records(job);
    let mut count = 0;
    for record in &records {
        let errors = record
            .events
            .iter()
            .filter(|event| {
                event
                    .properties
                    .iter()
                    .any(|(key, value)| key == "level" && value == "ERROR")
            })
            .collect::<Vec<_>>();
        if property(record, "attempt").is_some() {
            assert_eq!(
                errors.len(),
                usize::from(property(record, "outcome") == Some("failed"))
            );
            count += errors.len();
            if job == "permanent_test"
                && let [event] = errors.as_slice()
            {
                let value = |key: &str| {
                    event
                        .properties
                        .iter()
                        .find(|(name, _)| name == key)
                        .map(|(_, value)| value.as_ref())
                };
                assert_eq!(value("job"), Some(format!("{job:?}").as_str()));
                assert_eq!(
                    value("task_id"),
                    property(record, "task.id")
                        .map(|task_id| format!("{task_id:?}"))
                        .as_deref()
                );
                assert_eq!(value("attempt"), property(record, "attempt"));
                assert_eq!(
                    value("trace_id"),
                    Some(record.trace_id.to_string().as_str())
                );
                assert_eq!(
                    value("span_id"),
                    Some(record.span_id.to_string().as_str())
                );
                assert!(value("error").is_some_and(|error| error.contains(
                    "an error occurred when formatting an argument"
                )));
                assert_eq!(value("user_id"), Some("42"));
                assert!(
                    value("error")
                        .is_some_and(|error| error.contains("run test task"))
                );
            }
        } else {
            assert!(
                errors.is_empty(),
                "run spans must not repeat attempt errors"
            );
        }
    }
    assert_eq!(count, expected);
}

fn property<'a>(span: &'a SpanRecord, key: &str) -> Option<&'a str> {
    span.properties
        .iter()
        .find(|(name, _)| name == key)
        .map(|(_, value)| value.as_ref())
}

fn attempts(job: &str, outcome: &str) -> Result<u64, BoxedError> {
    let job_label = format!("job=\"{job}\"");
    let outcome_label = format!("outcome=\"{outcome}\"");
    let expected = BTreeSet::from([job_label.as_str(), outcome_label.as_str()]);
    for line in infra_observability::metrics::encode_metrics().lines() {
        let Some((sample, count)) = line.rsplit_once(' ') else {
            continue;
        };
        if let Some(labels) = sample
            .strip_prefix("thcdb_worker_job_duration_seconds_count{")
            .and_then(|sample| sample.strip_suffix('}'))
            && labels.split(',').collect::<BTreeSet<_>>() == expected
        {
            return Ok(count.parse()?);
        }
    }
    Ok(0)
}

fn request(job: &str, attempt: usize) -> Request<(), ()> {
    let mut request = Request::new_with_ctx((), ());
    request.parts.attempt = Attempt::new_with_value(attempt);
    request
        .parts
        .data
        .insert(Worker::new(WorkerId::new(job), WorkerContext::default()));
    request
}

#[tokio::test]
async fn registered_workers_use_the_builder_name_for_traces_and_metrics()
-> Result<(), BoxedError> {
    const JOB: &str = "registered_worker_test";
    reporter();
    let mut backend = MemoryStorage::new();
    backend
        .enqueue_request(Request::new_with_ctx((), ()))
        .await
        .map_err(|()| "could not enqueue task")?;
    let worker = WorkerBuilder::new(JOB)
        .layer(RunLayer)
        .layer(AttemptLayer::new())
        .backend(backend)
        .build_fn(|(): (), worker: Worker<WorkerContext>| async move {
            assert_eq!(worker.id().name(), JOB);
            worker.stop();
            Ok::<_, Error>(TaskOutcome::Completed)
        });
    tokio::time::timeout(
        Duration::from_secs(5),
        Monitor::new().register(worker).run(),
    )
    .await??;
    assert_eq!(attempts(JOB, "succeeded")?, 1);
    let records = records(JOB);
    let root = records
        .iter()
        .find(|span| span.name == format!("worker.{JOB}"))
        .ok_or("missing run")?;
    let attempt = records
        .iter()
        .find(|span| span.name == format!("worker.{JOB}.attempt"))
        .ok_or("missing attempt")?;
    assert_eq!(attempt.parent_id, root.span_id);
    Ok(())
}

#[tokio::test]
async fn completed_attempts_preserve_business_outcomes()
-> Result<(), BoxedError> {
    reporter();
    for (job, completion, outcome) in [
        ("completed_test", TaskOutcome::Completed, "succeeded"),
        ("skipped_test", TaskOutcome::Skipped, "skipped"),
        ("discarded_test", TaskOutcome::Discarded, "failed"),
    ] {
        let mut service = ServiceBuilder::new()
            .layer(RunLayer)
            .layer(AttemptLayer::new())
            .service(service_fn(|_: Request<(), ()>| async move {
                Ok::<_, Error>(completion)
            }));
        assert_eq!(service.call(request(job, 1)).await?, completion);
        assert_eq!(attempts(job, outcome)?, 1);
        let records = records(job);
        let root = records
            .iter()
            .find(|span| span.parent_id == SpanId::default())
            .ok_or("missing run")?;
        let attempt = records
            .iter()
            .find(|span| property(span, "attempt") == Some("1"))
            .ok_or("missing attempt")?;
        assert_eq!(attempt.parent_id, root.span_id);
        for span in [root, attempt] {
            assert_eq!(property(span, "outcome"), Some(outcome));
            assert_eq!(
                property(span, "span.status_code"),
                (outcome == "failed").then_some("error")
            );
        }
    }
    Ok(())
}

#[tokio::test]
async fn retries_share_a_run_and_keep_concurrent_child_spans_separate()
-> Result<(), BoxedError> {
    const JOB: &str = "retry_trace_test";
    reporter();
    let mut tasks = Vec::new();
    for _ in 0..2 {
        let executions = Arc::new(AtomicUsize::new(0));
        let backoff = ExponentialBackoffMaker::new(
            Duration::from_millis(1),
            Duration::from_millis(1),
            0.0,
            HasherRng::default(),
        )?
        .make_backoff();
        let mut service = ServiceBuilder::new()
            .layer(RunLayer)
            .layer(RetryLayer::new(
                RetryPolicy::retries(2).with_backoff(backoff),
            ))
            .layer(AttemptLayer::new())
            .service(service_fn(move |_: Request<(), ()>| {
                let sync_child =
                    Span::enter_with_local_parent("sync.operation");
                drop(sync_child);
                let executions = executions.clone();
                async move {
                    tokio::task::yield_now().await;
                    let _child =
                        Span::enter_with_local_parent("async.operation");
                    tokio::task::yield_now().await;
                    if executions.fetch_add(1, Ordering::Relaxed) == 0 {
                        Err(retryable_error(std::fmt::Error))
                    } else {
                        Ok(TaskOutcome::Completed)
                    }
                }
            }));
        tasks.push(tokio::spawn(
            async move { service.call(request(JOB, 1)).await },
        ));
    }
    for task in tasks {
        assert_eq!(task.await??, TaskOutcome::Completed);
    }
    assert_eq!(attempts(JOB, "failed")?, 2);
    assert_error_reports(JOB, 2);
    assert_eq!(attempts(JOB, "succeeded")?, 2);
    fastrace::flush();
    let all = reporter().spans.lock().clone();
    let records = records(JOB);
    let roots = records
        .iter()
        .filter(|span| span.parent_id == SpanId::default())
        .collect::<Vec<_>>();
    assert_eq!(roots.len(), 2);
    assert_ne!(roots[0].trace_id, roots[1].trace_id);
    for root in roots {
        assert_eq!(property(root, "outcome"), Some("succeeded"));
        assert!(root.duration_ns >= 1_000_000);
        let mut attempts = records
            .iter()
            .filter(|span| span.parent_id == root.span_id)
            .collect::<Vec<_>>();
        attempts.sort_by_key(|span| property(span, "attempt"));
        assert_eq!(attempts.len(), 2);
        assert!(
            root.duration_ns
                > attempts
                    .iter()
                    .map(|attempt| attempt.duration_ns)
                    .sum::<u64>()
        );
        for (index, attempt) in attempts.into_iter().enumerate() {
            assert_eq!(
                property(attempt, "attempt"),
                Some((index + 1).to_string().as_str())
            );
            assert_eq!(
                property(attempt, "outcome"),
                Some(if index == 0 { "failed" } else { "succeeded" })
            );
            let children = all
                .iter()
                .filter(|span| {
                    (span.trace_id, span.parent_id)
                        == (root.trace_id, attempt.span_id)
                })
                .map(|span| span.name.as_ref())
                .collect::<BTreeSet<_>>();
            assert_eq!(
                children,
                BTreeSet::from(["sync.operation", "async.operation"])
            );
        }
    }
    Ok(())
}

#[tokio::test]
async fn exhausted_and_permanent_failures_stop_at_the_policy_boundary()
-> Result<(), BoxedError> {
    reporter();
    for (job, permanent, count) in
        [("exhausted_test", false, 3), ("permanent_test", true, 1)]
    {
        let mut service = ServiceBuilder::new()
            .layer(RunLayer)
            .layer(RetryLayer::new(RetryPolicy::retries(2)))
            .layer(AttemptLayer::with_fields(|(): &()| [("user_id", 42)]))
            .service(service_fn(move |_: Request<(), ()>| async move {
                Err::<TaskOutcome, _>(if permanent {
                    permanent_error(infra_error::ContextError::new(
                        "run test task",
                        std::fmt::Error,
                    ))
                } else {
                    retryable_error(infra_error::ContextError::new(
                        "run test task",
                        std::fmt::Error,
                    ))
                })
            }));
        assert!(matches!(
            service.call(request(job, 1)).await,
            Err(Error::Abort(_))
        ));
        assert_eq!(attempts(job, "failed")?, count);
        assert_error_reports(job, usize::try_from(count)?);
        assert!(
            records(job)
                .iter()
                .all(|span| property(span, "outcome") == Some("failed"))
        );
    }
    Ok(())
}

#[tokio::test]
async fn redelivery_starts_a_new_run() -> Result<(), BoxedError> {
    const JOB: &str = "redelivery_test";
    reporter();
    let mut service = ServiceBuilder::new()
        .layer(RunLayer)
        .layer(RetryLayer::new(RetryPolicy::retries(2)))
        .layer(AttemptLayer::new())
        .service(service_fn(|_: Request<(), ()>| async {
            Ok::<_, Error>(TaskOutcome::Completed)
        }));
    let request = request(JOB, 7);
    assert_eq!(service.call(request.clone()).await?, TaskOutcome::Completed);
    assert_eq!(service.call(request).await?, TaskOutcome::Completed);
    assert_eq!(attempts(JOB, "succeeded")?, 2);
    assert_eq!(
        records(JOB)
            .iter()
            .filter(|span| span.parent_id == SpanId::default())
            .count(),
        2
    );
    Ok(())
}

#[tokio::test]
async fn cancelling_retry_backoff_keeps_the_run_incomplete()
-> Result<(), BoxedError> {
    const JOB: &str = "backoff_cancel_test";
    reporter();
    let backoff = ExponentialBackoffMaker::new(
        Duration::from_secs(60),
        Duration::from_secs(60),
        0.0,
        HasherRng::default(),
    )?
    .make_backoff();
    let mut service = ServiceBuilder::new()
        .layer(RunLayer)
        .layer(RetryLayer::new(
            RetryPolicy::retries(2).with_backoff(backoff),
        ))
        .layer(AttemptLayer::new())
        .service(service_fn(|_: Request<(), ()>| async {
            Err::<TaskOutcome, _>(retryable_error(std::fmt::Error))
        }));
    let mut future = service.call(request(JOB, 1));
    assert!(
        future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop()))
            .is_pending()
    );
    drop(future);
    assert_eq!(attempts(JOB, "failed")?, 1);
    assert_error_reports(JOB, 1);
    let records = records(JOB);
    let root = records
        .iter()
        .find(|span| span.parent_id == SpanId::default())
        .ok_or("missing cancelled run")?;
    assert_eq!(property(root, "outcome"), None);
    Ok(())
}

#[tokio::test]
async fn cancelled_attempts_do_not_record_completed_outcomes()
-> Result<(), BoxedError> {
    const JOB: &str = "attempt_cancel_test";
    reporter();
    let mut service = ServiceBuilder::new()
        .layer(RunLayer)
        .layer(AttemptLayer::new())
        .service(service_fn(|_: Request<(), ()>| async {
            std::future::pending::<()>().await;
            Ok::<_, Error>(TaskOutcome::Completed)
        }));
    // Construction alone must not count an execution or an outcome.
    drop(service.call(request(JOB, 1)));
    let mut future = service.call(request(JOB, 1));
    assert!(
        future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop()))
            .is_pending()
    );
    drop(future);
    assert_eq!(attempts(JOB, "succeeded")?, 0);
    assert_eq!(attempts(JOB, "failed")?, 0);
    assert!(
        records(JOB)
            .iter()
            .all(|span| property(span, "outcome").is_none())
    );
    Ok(())
}

#[test]
fn monitor_reports_backend_failures_without_repeating_handler_failures()
-> Result<(), BoxedError> {
    use apalis::layers::retry::RetryPolicyError;
    use apalis_redis::{RedisError, RedisPollError};

    const JOB: &str = "backend_error_test";
    reporter();
    let span = Span::root("monitor", fastrace::prelude::SpanContext::random())
        .with_property(|| ("job.name", JOB));
    {
        let _parent = span.set_local_parent();
        for error in [
            retryable_error(std::fmt::Error),
            permanent_error(std::fmt::Error),
            permanent_error(RetryPolicyError::OutOfRetries {
                current_attempt: 3,
                inner: retryable_error(std::fmt::Error),
            }),
            permanent_error(RetryPolicyError::ZeroRetries(retryable_error(
                std::fmt::Error,
            ))),
            Error::MissingData("missing worker state".to_owned()),
            retryable_error(RedisPollError::AckError(RedisError::from(
                std::io::Error::other("handler failure"),
            ))),
        ] {
            report_backend_error(JOB, &error);
        }
        for error in [
            RedisPollError::AckError(RedisError::from(std::io::Error::other(
                "persistent acknowledgement failed",
            ))),
            RedisPollError::PollNextError(RedisError::from(
                std::io::Error::other("task polling failed"),
            )),
        ] {
            report_backend_error(JOB, &error);
        }
        let error = Error::SourceError(Arc::new(Box::new(
            apalis_cron::CronStreamError::OutOfRangeError {
                inner: chrono::Duration::seconds(-1)
                    .to_std()
                    .expect_err("negative durations cannot be scheduled"),
                tick: chrono::Utc::now(),
            },
        )));
        report_backend_error(JOB, &error);
    }
    drop(span);
    let records = records(JOB);
    let events = &records.first().ok_or("missing monitor span")?.events;
    assert_eq!(events.len(), 3);
    for (event, cause) in events.iter().zip([
        "persistent acknowledgement failed",
        "task polling failed",
        "OutOfRangeError",
    ]) {
        assert_eq!(event.name, "worker backend failed");
        assert!(
            event
                .properties
                .iter()
                .any(|(key, value)| key == "error" && value.contains(cause))
        );
        assert!(
            event.properties.iter().any(
                |(key, value)| key == "job" && value == &format!("{JOB:?}")
            )
        );
    }
    Ok(())
}
