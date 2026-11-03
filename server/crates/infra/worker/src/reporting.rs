use std::error::Error as StdError;

use apalis_cron::CronStreamError;
use apalis_redis::RedisPollError;
use chrono::Utc;

use crate::Error;

/// Report failures from the registered Redis and UTC cron backends. Redis emits
/// heartbeat errors directly; cron wraps its stream errors in `Error::SourceError`.
/// Handler errors are reported by `AttemptLayer`.
pub fn report_backend_error(job: &str, error: &(dyn StdError + 'static)) {
    let cron_error = matches!(
        error.downcast_ref::<Error>(),
        Some(Error::SourceError(source)) if source.is::<CronStreamError<Utc>>()
    );
    if error.is::<RedisPollError>() || cron_error {
        log::error!(target: "infra.worker", job, error:? = error;
            "worker backend failed");
    }
}
