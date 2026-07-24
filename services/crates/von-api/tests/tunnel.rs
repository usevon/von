//! Exercises the websocket tunnel end to end against a live stack, covering
//! registration, proxy round trips, takeover, and disconnect cleanup.

mod support;

use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::time::Duration;
use support::Fixture;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::{Error as WsError, Message};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async};

type Socket = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;

async fn register(fixture: &Fixture, key: &str, port: u16) -> (String, String) {
    let (status, body) = fixture
        .post(key, "/register", json!({ "port": port }))
        .await;
    assert_eq!(status, 200, "register failed with {body}");
    let tunnel_id = body["tunnelId"].as_str().expect("tunnelId").to_owned();
    let secret = body["secret"].as_str().expect("secret").to_owned();
    (tunnel_id, secret)
}

async fn try_connect(
    fixture: &Fixture,
    bearer: Option<&str>,
    tunnel_id: &str,
) -> Result<Socket, WsError> {
    let url = format!("{}/ws/{tunnel_id}", fixture.base.replacen("http", "ws", 1));
    let mut request = url.into_client_request().expect("ws request");
    if let Some(key) = bearer {
        request.headers_mut().insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {key}")).expect("auth header"),
        );
    }
    connect_async(request).await.map(|(socket, _)| socket)
}

async fn connect(fixture: &Fixture, key: &str, tunnel_id: &str) -> Socket {
    try_connect(fixture, Some(key), tunnel_id)
        .await
        .expect("ws connect")
}

/// The registry insert precedes the redis registration, so a listed tunnel is routable.
async fn wait_until_listed(fixture: &Fixture, key: &str, tunnel_id: &str) {
    for _ in 0..50 {
        let (status, body) = fixture.get(key, "/tunnels").await;
        assert_eq!(status, 200);
        let listed = body["tunnels"]
            .as_array()
            .is_some_and(|tunnels| tunnels.iter().any(|id| id == tunnel_id));
        if listed {
            return;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    panic!("tunnel {tunnel_id} never appeared in /tunnels");
}

async fn next_tunnel_request(socket: &mut Socket) -> serde_json::Value {
    loop {
        let frame = tokio::time::timeout(Duration::from_secs(10), socket.next())
            .await
            .expect("frame before deadline")
            .expect("socket still open")
            .expect("readable frame");
        if let Message::Text(text) = frame {
            let value: serde_json::Value = serde_json::from_str(text.as_str()).expect("json frame");
            if value.get("id").is_some() {
                return value;
            }
        }
    }
}

async fn answer(socket: &mut Socket, request_id: &str, status: u16, body: &serde_json::Value) {
    let frame = json!({
        "requestId": request_id,
        "status": status,
        "headers": { "content-type": "application/json", "x-tunnel-test": "yes" },
        "body": body.to_string(),
    });
    socket
        .send(Message::text(frame.to_string()))
        .await
        .expect("send tunnel response");
}

fn is_lower_hex(value: &str) -> bool {
    value
        .chars()
        .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
}

#[tokio::test]
async fn register_issues_a_random_id_and_reuses_the_active_row_per_port() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["write:tunnels"]).await;

    let (tunnel_id, secret) = register(&fixture, &key, 3000).await;
    assert_eq!(tunnel_id.len(), 32);
    assert!(is_lower_hex(&tunnel_id));
    assert_eq!(secret.len(), 32);
    assert!(is_lower_hex(&secret));

    // A derivable id would leak the tenant identifiers it was minted for.
    let org_simple = fixture.organization_id.replace('-', "");
    let user_simple = fixture.user_id.replace('-', "");
    assert_ne!(tunnel_id, org_simple);
    assert_ne!(tunnel_id, user_simple);
    assert!(!tunnel_id.contains("3000"));

    let (again_id, again_secret) = register(&fixture, &key, 3000).await;
    assert_eq!(again_id, tunnel_id);
    assert_eq!(again_secret, secret);

    let (other_id, _) = register(&fixture, &key, 3001).await;
    assert_ne!(other_id, tunnel_id);

    fixture.cleanup().await;
}

#[tokio::test]
async fn register_requires_the_write_tunnels_scope() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["read:tunnels"]).await;

    let (status, body) = fixture
        .post(&key, "/register", json!({ "port": 3000 }))
        .await;
    assert_eq!(status, 403);
    assert_eq!(
        body["error"]["message"],
        "API key lacks required scope write:tunnels"
    );

    fixture.cleanup().await;
}

#[tokio::test]
async fn websocket_handshake_rejects_missing_auth_and_unknown_tunnels() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["write:tunnels"]).await;
    let (tunnel_id, _) = register(&fixture, &key, 3100).await;

    match try_connect(&fixture, None, &tunnel_id).await {
        Err(WsError::Http(response)) => assert_eq!(response.status().as_u16(), 401),
        other => panic!("expected 401 rejection, got {other:?}"),
    }

    let unknown = uuid::Uuid::new_v4().simple().to_string();
    match try_connect(&fixture, Some(&key), &unknown).await {
        Err(WsError::Http(response)) => assert_eq!(response.status().as_u16(), 404),
        other => panic!("expected 404 rejection, got {other:?}"),
    }

    fixture.cleanup().await;
}

#[tokio::test]
async fn proxy_round_trips_a_request_through_the_client_socket() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["write:tunnels", "read:tunnels"]).await;
    let (tunnel_id, _) = register(&fixture, &key, 3200).await;

    let mut socket = connect(&fixture, &key, &tunnel_id).await;
    wait_until_listed(&fixture, &key, &tunnel_id).await;

    let proxy = tokio::spawn({
        let client = fixture.client.clone();
        let url = format!("{}/t/{tunnel_id}/hook?probe=1", fixture.base);
        async move {
            client
                .post(url)
                .header("x-probe", "abc")
                .json(&json!({ "hello": "world" }))
                .timeout(Duration::from_secs(10))
                .send()
                .await
                .expect("proxy request")
        }
    });

    let request = next_tunnel_request(&mut socket).await;
    assert_eq!(request["method"], "POST");
    assert_eq!(request["path"], "/hook?probe=1");
    assert_eq!(request["headers"]["x-probe"], "abc");
    let forwarded: serde_json::Value =
        serde_json::from_str(request["body"].as_str().expect("body")).expect("body json");
    assert_eq!(forwarded, json!({ "hello": "world" }));

    let request_id = request["id"].as_str().expect("request id");
    answer(&mut socket, request_id, 418, &json!({ "answered": true })).await;

    let response = proxy.await.expect("proxy task");
    assert_eq!(response.status().as_u16(), 418);
    assert_eq!(
        response
            .headers()
            .get("x-tunnel-test")
            .and_then(|v| v.to_str().ok()),
        Some("yes")
    );
    let body: serde_json::Value = response.json().await.expect("proxy body");
    assert_eq!(body, json!({ "answered": true }));

    fixture.cleanup().await;
}

#[tokio::test]
async fn second_socket_takes_over_and_keeps_the_proxy_working() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["write:tunnels", "read:tunnels"]).await;
    let (tunnel_id, _) = register(&fixture, &key, 3300).await;

    let mut first = connect(&fixture, &key, &tunnel_id).await;
    wait_until_listed(&fixture, &key, &tunnel_id).await;
    let mut second = connect(&fixture, &key, &tunnel_id).await;

    // The takeover frame races the shutdown signal in the writer select, so a
    // silent close is tolerated here even though a guaranteed frame would be better.
    let mut saw_takeover = false;
    let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    loop {
        match tokio::time::timeout_at(deadline, first.next()).await {
            Ok(Some(Ok(Message::Text(text)))) => {
                let value: serde_json::Value =
                    serde_json::from_str(text.as_str()).unwrap_or(serde_json::Value::Null);
                if value["type"] == "takeover" {
                    saw_takeover = true;
                }
            }
            Ok(Some(Ok(Message::Close(_)))) | Ok(None) | Ok(Some(Err(_))) => break,
            Ok(Some(Ok(_))) => continue,
            Err(_) => panic!("first socket neither received takeover nor closed"),
        }
    }
    eprintln!("takeover frame delivered before close, {saw_takeover}");

    let proxy = tokio::spawn({
        let client = fixture.client.clone();
        let url = format!("{}/t/{tunnel_id}/after-takeover", fixture.base);
        async move {
            client
                .get(url)
                .timeout(Duration::from_secs(10))
                .send()
                .await
                .expect("proxy request")
        }
    });

    let request = next_tunnel_request(&mut second).await;
    assert_eq!(request["method"], "GET");
    assert_eq!(request["path"], "/after-takeover");
    let request_id = request["id"].as_str().expect("request id");
    answer(&mut second, request_id, 200, &json!({ "owner": "second" })).await;

    let response = proxy.await.expect("proxy task");
    assert_eq!(response.status().as_u16(), 200);
    let body: serde_json::Value = response.json().await.expect("proxy body");
    assert_eq!(body, json!({ "owner": "second" }));

    fixture.cleanup().await;
}

#[tokio::test]
async fn closed_socket_stops_serving_the_proxy() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["write:tunnels", "read:tunnels"]).await;
    let (tunnel_id, _) = register(&fixture, &key, 3400).await;

    let mut socket = connect(&fixture, &key, &tunnel_id).await;
    wait_until_listed(&fixture, &key, &tunnel_id).await;
    socket.close(None).await.expect("close socket");
    drop(socket);

    // Teardown is asynchronous, so a transient 502 is allowed before the 404 lands.
    let url = format!("{}/t/{tunnel_id}/gone", fixture.base);
    let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    loop {
        let response = fixture
            .client
            .get(&url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .expect("proxy request");
        let status = response.status().as_u16();
        assert!(
            status == 404 || status == 502,
            "expected 404 or 502 after disconnect, got {status}"
        );
        if status == 404 {
            let body: serde_json::Value = response.json().await.expect("error body");
            assert_eq!(body["error"]["message"], "Tunnel not found");
            break;
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "proxy kept returning 502 after disconnect"
        );
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    fixture.cleanup().await;
}
