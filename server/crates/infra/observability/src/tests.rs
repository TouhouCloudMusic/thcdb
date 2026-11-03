use std::time::Duration;

use super::database::record_query_result;
use super::metrics::encode_metrics;

#[test]
fn successful_and_failed_queries_are_counted_separately() {
    record_query_result("query_one", &Ok::<_, ()>(()), Duration::ZERO);
    record_query_result("query_one", &Err::<(), _>(()), Duration::ZERO);

    let metrics = encode_metrics();
    for outcome in ["succeeded", "failed"] {
        assert!(metrics.lines().any(|line| {
            line.starts_with("thcdb_db_operation_duration_seconds_count{")
                && line.contains("operation=\"query_one\"")
                && line.contains(&format!("outcome=\"{outcome}\""))
                && line.ends_with(" 1")
        }));
    }
}
