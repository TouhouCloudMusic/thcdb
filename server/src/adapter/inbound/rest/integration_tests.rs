use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::Request;
use futures_util::FutureExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tower::ServiceExt;

use super::*;
use crate::infra::integration_test::{flush_traces, test_state, trace_records};

async fn http_get(address: SocketAddr, path: &str) -> anyhow::Result<String> {
    let mut connection = TcpStream::connect(address).await?;
    connection
        .write_all(
            format!(
                "GET {path} HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n"
            )
            .as_bytes(),
        )
        .await?;
    let mut response = Vec::new();
    connection.read_to_end(&mut response).await?;
    let response = String::from_utf8(response)?;
    assert!(response.starts_with("HTTP/1.1 200 OK\r\n"), "{response}");
    Ok(response)
}

#[tokio::test]
async fn http_remains_available_when_metrics_are_unavailable()
-> anyhow::Result<()> {
    let (state, _images) = test_state().await?;
    let state = Arc::new(state);
    let occupied = TcpListener::bind("127.0.0.1:0").await?;
    let available = TcpListener::bind("127.0.0.1:0").await?;
    let metrics_address = available.local_addr()?;
    drop(available);

    for (address, enabled) in [
        (None, false),
        (Some("invalid-address".to_owned()), false),
        (Some(occupied.local_addr()?.to_string()), false),
        (Some(metrics_address.to_string()), true),
    ] {
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let http_address = listener.local_addr()?;
        let (shutdown, stopped) = tokio::sync::oneshot::channel();
        let shutdown_signal = async {
            let _ = stopped.await;
        }
        .boxed()
        .shared();
        let serving =
            listen(listener, Arc::clone(&state), address, shutdown_signal);
        let checking = async {
            http_get(http_address, "/health_check").await?;
            if enabled {
                let metrics = http_get(metrics_address, "/metrics").await?;
                assert!(metrics.contains("# EOF"));
            }
            shutdown
                .send(())
                .map_err(|()| anyhow::anyhow!("HTTP listener stopped early"))?;
            Ok::<_, anyhow::Error>(())
        };

        tokio::time::timeout(Duration::from_secs(5), async {
            tokio::try_join!(async { Ok(serving.await?) }, checking)
        })
        .await??;
        assert!(TcpStream::connect(http_address).await.is_err());
        if enabled {
            assert!(TcpStream::connect(metrics_address).await.is_err());
        }
    }
    Ok(())
}

#[tokio::test]
async fn rejected_api_requests_keep_trace_identity_and_http_metrics()
-> anyhow::Result<()> {
    trace_records();
    let (state, _images) = test_state().await?;
    let trace_id = fastrace::collector::TraceId::random();
    let route = "/admin/users";
    let before = unauthorized_request_count()?;
    let request = Request::builder()
        .uri(route)
        .header(
            "traceparent",
            format!("00-{:032x}-0000000000000001-01", trace_id.0),
        )
        .extension(ConnectInfo("127.0.0.1:49321".parse::<SocketAddr>()?))
        .body(Body::empty())?;

    let response = router(ArcAppState::new(Arc::new(state)))
        .oneshot(request)
        .await?;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response.headers()["x-trace-id"],
        format!("{:032x}", trace_id.0)
    );
    drop(response);
    flush_traces();

    let records = trace_records();
    let request_span = records
        .iter()
        .find(|span| {
            span.trace_id == trace_id && span.name == "GET /admin/users"
        })
        .ok_or_else(|| anyhow::anyhow!("missing HTTP request span"))?;
    for (key, value) in [
        ("http.request.method", "GET"),
        ("http.route", route),
        ("http.response.status_code", "401"),
    ] {
        assert!(
            request_span
                .properties
                .iter()
                .any(|(name, actual)| name == key && actual == value)
        );
    }

    assert_eq!(unauthorized_request_count()?, before + 1);
    Ok(())
}

fn unauthorized_request_count() -> anyhow::Result<u64> {
    for line in infra_observability::metrics::encode_metrics().lines() {
        let Some((sample, count)) = line.rsplit_once(' ') else {
            continue;
        };
        if sample.starts_with("thcdb_http_request_duration_seconds_count{")
            && sample.contains("method=\"GET\"")
            && sample.contains("route=\"/admin/users\"")
            && sample.contains("status=\"401\"")
        {
            return Ok(count.parse()?);
        }
    }
    Ok(0)
}
