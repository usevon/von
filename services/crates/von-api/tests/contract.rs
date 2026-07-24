//! Guards the cross service wire shapes, the redis buffer entry and the
//! better-auth session record the dashboard writes.

mod support;
use serde_json::json;
use support::Fixture;
use von_types::{BufferedDelivery, BufferedEntry, BufferedEvent, STREAM_KEY};

macro_rules! fixture_or_skip {
    () => {
        match Fixture::new().await {
            Some(fixture) => fixture,
            None => {
                eprintln!("skipping, DATABASE_URL and REDIS_URL are required");
                return;
            }
        }
    };
}

#[tokio::test]
async fn buffered_entry_round_trips_through_the_stream() {
    let fixture = fixture_or_skip!();
    let endpoint_id = fixture.seed_endpoint(None).await;

    let event_id = uuid::Uuid::new_v4().to_string();
    let delivery_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let entry = BufferedEntry {
        events: vec![BufferedEvent {
            id: event_id.clone(),
            organization_id: fixture.organization_id.clone(),
            event_type: "contract.probe".to_owned(),
            payload: serde_json::value::RawValue::from_string(r#"{"shape":true}"#.to_owned())
                .expect("payload"),
            idempotency_key: Some("contract-key".to_owned()),
            created_at: now.clone(),
        }],
        deliveries: vec![BufferedDelivery {
            id: delivery_id.clone(),
            organization_id: fixture.organization_id.clone(),
            event_id: event_id.clone(),
            endpoint_id: endpoint_id.clone(),
            status: "pending".to_owned(),
            attempts: 0,
            created_at: now.clone(),
        }],
    };

    let mut conn = fixture.redis.clone();
    let stream_id: String = redis::cmd("XADD")
        .arg(STREAM_KEY)
        .arg("*")
        .arg("data")
        .arg(serde_json::to_string(&entry).expect("encode"))
        .query_async(&mut conn)
        .await
        .expect("xadd");

    let read: Vec<(String, Vec<String>)> = redis::cmd("XRANGE")
        .arg(STREAM_KEY)
        .arg(&stream_id)
        .arg(&stream_id)
        .query_async(&mut conn)
        .await
        .expect("xrange");
    assert_eq!(read.len(), 1);
    let fields = &read[0].1;
    assert_eq!(fields[0], "data");
    let raw = &fields[1];

    // The raw JSON must carry the camelCase keys the TypeScript flusher wrote and read.
    let value: serde_json::Value = serde_json::from_str(raw).expect("json");
    let event = &value["events"][0];
    assert_eq!(event["id"], event_id);
    assert_eq!(event["organizationId"], fixture.organization_id);
    assert_eq!(event["eventType"], "contract.probe");
    assert_eq!(event["idempotencyKey"], "contract-key");
    assert_eq!(event["createdAt"], now);
    assert_eq!(event["payload"], json!({ "shape": true }));
    let delivery = &value["deliveries"][0];
    assert_eq!(delivery["id"], delivery_id);
    assert_eq!(delivery["eventId"], event_id);
    assert_eq!(delivery["endpointId"], endpoint_id);
    assert_eq!(delivery["status"], "pending");
    assert_eq!(delivery["attempts"], 0);

    let parsed: BufferedEntry = serde_json::from_str(raw).expect("flusher-side parse");
    assert_eq!(parsed.events.len(), 1);
    assert_eq!(parsed.events[0].id, event_id);
    assert_eq!(parsed.events[0].organization_id, fixture.organization_id);
    assert_eq!(parsed.events[0].event_type, "contract.probe");
    assert_eq!(
        parsed.events[0].idempotency_key.as_deref(),
        Some("contract-key")
    );
    assert_eq!(parsed.deliveries.len(), 1);
    assert_eq!(parsed.deliveries[0].endpoint_id, endpoint_id);
    assert_eq!(parsed.deliveries[0].attempts, 0);

    let _: redis::RedisResult<i64> = redis::cmd("XDEL")
        .arg(STREAM_KEY)
        .arg(&stream_id)
        .query_async(&mut conn)
        .await;

    fixture.cleanup().await;
}

#[tokio::test]
async fn dashboard_session_bearer_resolves_and_expired_one_does_not() {
    let fixture = fixture_or_skip!();

    let live = format!("von-test-session-{}", uuid::Uuid::new_v4().simple());
    fixture
        .put_session(&live, chrono::Utc::now() + chrono::Duration::hours(1))
        .await;
    let (status, body) = fixture.get(&live, "/tunnels").await;
    assert_eq!(status, 200);
    assert_eq!(body["tunnels"], json!([]));

    let expired = format!("von-test-session-{}", uuid::Uuid::new_v4().simple());
    fixture
        .put_session(&expired, chrono::Utc::now() - chrono::Duration::hours(1))
        .await;
    let (status, body) = fixture.get(&expired, "/tunnels").await;
    assert_eq!(status, 401);
    assert_eq!(body["error"]["message"], "api key not found or disabled");

    fixture.delete_redis_key(&live).await;
    fixture.delete_redis_key(&expired).await;
    fixture.cleanup().await;
}
