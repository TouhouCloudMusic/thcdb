use std::io;
use std::time::Duration;

use infra_worker::{Event, Monitor};

use crate::infra::singleton::APP_CONFIG;
use crate::infra::state::AppState;

const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(35);

pub async fn run(state: &AppState) -> io::Result<()> {
    let monitor = infra_storage_worker::register_workers(
        Monitor::new(),
        state.remove_file_queue.clone(),
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

    let (terminal_event_sender, mut terminal_events) =
        tokio::sync::mpsc::unbounded_channel();
    let monitor = monitor
        .on_event(move |worker| {
            if matches!(worker.inner(), Event::Stop | Event::Exit) {
                let _ = terminal_event_sender.send(worker.id().to_string());
            }
        })
        .with_terminator(async {
            tokio::time::sleep(SHUTDOWN_TIMEOUT).await;
        });

    let mut stopped_worker = None;
    monitor
        .run_with_signal(async {
            stopped_worker = terminal_events.recv().await;
            Ok(())
        })
        .await?;

    let stopped_worker = stopped_worker
        .ok_or_else(|| io::Error::other("worker event channel closed"))?;

    Err(io::Error::other(format!(
        "worker {stopped_worker} stopped unexpectedly"
    )))
}
