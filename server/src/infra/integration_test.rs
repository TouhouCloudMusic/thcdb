use std::sync::OnceLock;

use fastrace::collector::{Config, SpanRecord, TestReporter};
use infra_db::DatabaseConnection;
use infra_storage::FsStorage;
use tempfile::TempDir;

use crate::features::auth::sync_startup_data;
use crate::infra::state::AppState;

pub(crate) mod fixture;

static TRACE_REPORTER: OnceLock<TestReporter> = OnceLock::new();

fn trace_reporter() -> &'static TestReporter {
    TRACE_REPORTER.get_or_init(|| {
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

pub fn flush_traces() {
    trace_reporter();
    fastrace::flush();
}

pub fn trace_records() -> Vec<SpanRecord> {
    trace_reporter().spans.lock().clone()
}

pub async fn test_state() -> anyhow::Result<(AppState, TempDir)> {
    let config = config::Config::builder()
        .add_source(config::File::with_name("config"))
        .set_override("database_url", infra_testing::test_database_url())?
        .set_override("redis_url", infra_testing::test_redis_url())?
        .set_override("email.creds.password", "test-only")?
        .build()?
        .try_deserialize()?;
    let images = tempfile::tempdir()?;
    test_connection().await?;
    let state = {
        // Startup publishes a popularity snapshot shared by the route tests.
        static INIT: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
        let _initialization = INIT.lock().await;
        AppState::init(&config, FsStorage::new(images.path().to_path_buf())?)
            .await
            .map_err(|error| anyhow::anyhow!("{error:?}"))?
    };
    Ok((state, images))
}

pub async fn test_connection() -> anyhow::Result<DatabaseConnection> {
    static STARTUP_DATA: tokio::sync::OnceCell<()> =
        tokio::sync::OnceCell::const_new();
    trace_reporter();
    let conn = infra_testing::test_connection().await;
    STARTUP_DATA
        .get_or_try_init(|| async { sync_startup_data(&conn).await })
        .await?;
    Ok(conn)
}
