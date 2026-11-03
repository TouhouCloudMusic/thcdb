use std::future::Future;
use std::io;
use std::time::Duration;

use infra_worker::{Event, Monitor, report_backend_error};

use crate::infra::singleton::APP_CONFIG;
use crate::infra::state::AppState;

const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(35);

pub async fn run(
    state: &AppState,
    shutdown: impl Future<Output = ()> + Send,
) -> io::Result<()> {
    let monitor = crate::features::popularity::register_workers(
        Monitor::default(),
        state.clone(),
    );
    let monitor = auth_worker::register_workers(
        monitor,
        state.sea_orm_repo.clone(),
        state.redis_pool(),
        state.mailer.clone(),
        state.password_reset_email_queue.clone(),
    );
    let monitor = notification_worker::register_workers(
        monitor,
        state.sea_orm_repo.clone(),
        APP_CONFIG.notification.retention_days,
    );

    let monitor = crate::features::image_gc::register_workers(
        monitor,
        state.sea_orm_repo.clone(),
        state.image_storage.clone(),
    );

    let (terminal_event_sender, mut terminal_events) =
        tokio::sync::mpsc::unbounded_channel();
    let monitor = monitor
        .on_event(move |worker| {
            let name = worker.id().name();

            match worker.inner() {
                Event::Error(error) => {
                    report_backend_error(name, error.as_ref());
                }
                Event::Stop | Event::Exit => {
                    let _ = terminal_event_sender.send(name.to_owned());
                }
                _ => {}
            }
        })
        .with_terminator(async {
            tokio::time::sleep(SHUTDOWN_TIMEOUT).await;
        });

    let mut shutdown_requested = false;
    let mut stopped_worker = None;
    monitor
        .run_with_signal(async {
            tokio::select! {
                biased;
                () = shutdown => {
                    shutdown_requested = true;
                }
                stopped = terminal_events.recv() => {
                    stopped_worker = stopped;
                }
            }
            Ok(())
        })
        .await?;

    if shutdown_requested {
        return Ok(());
    }

    let stopped_worker = stopped_worker
        .ok_or_else(|| io::Error::other("worker event channel closed"))?;

    Err(io::Error::other(format!(
        "worker {stopped_worker} stopped unexpectedly"
    )))
}
