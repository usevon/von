//! Pins the replay endpoints, bulk convergence via replayed_at and single event fanout.

mod support;
use serde_json::json;
use support::Fixture;

use support::fixture_or_skip;

#[tokio::test]
async fn bulk_replay_copies_each_failed_delivery_once_and_converges() {
    let fixture = fixture_or_skip!();
    let endpoint_id = fixture.seed_endpoint(None).await;

    let failed_one = fixture.seed_event("order.paid").await;
    let failed_two = fixture.seed_event("order.refunded").await;
    let delivered = fixture.seed_event("order.shipped").await;
    fixture
        .seed_delivery(&failed_one, &endpoint_id, "failed")
        .await;
    fixture
        .seed_delivery(&failed_two, &endpoint_id, "failed")
        .await;
    fixture
        .seed_delivery(&delivered, &endpoint_id, "delivered")
        .await;

    // The key is minted after seeding so the tenant cache sees the endpoint.
    let key = fixture.create_key(&["*"]).await;

    let (status, body) = fixture
        .post(
            &key,
            "/webhooks/events/replay",
            json!({ "since": "2020-01-01" }),
        )
        .await;
    assert_eq!(status, 200);
    assert_eq!(body["replayed"], 2, "one copy per failed original");

    for event_id in [&failed_one, &failed_two] {
        let rows = fixture.deliveries_for_event(event_id).await;
        assert_eq!(rows.len(), 2, "the failed original gains exactly one copy");
        let pending = rows
            .iter()
            .filter(|(_, _, status)| status == "pending")
            .count();
        assert_eq!(pending, 1, "the copy must start pending");
    }
    assert_eq!(
        fixture.deliveries_for_event(&delivered).await.len(),
        1,
        "a delivered row must not be replayed"
    );

    let (status, body) = fixture
        .post(
            &key,
            "/webhooks/events/replay",
            json!({ "since": "2020-01-01" }),
        )
        .await;
    assert_eq!(status, 200);
    assert_eq!(body["replayed"], 0, "a second bulk replay must be a no-op");
    assert_eq!(fixture.deliveries_for_event(&failed_one).await.len(), 2);
    assert_eq!(fixture.deliveries_for_event(&failed_two).await.len(), 2);

    fixture.cleanup().await;
}

#[tokio::test]
async fn single_event_replay_targets_only_subscribed_endpoints() {
    let fixture = fixture_or_skip!();
    let subscribed = fixture
        .seed_endpoint(Some(vec!["order.*".to_owned()]))
        .await;
    let unsubscribed = fixture
        .seed_endpoint(Some(vec!["billing.invoice".to_owned()]))
        .await;
    let event_id = fixture.seed_event("order.paid").await;

    let key = fixture.create_key(&["*"]).await;

    let (status, body) = fixture
        .post_empty(&key, &format!("/webhooks/events/{event_id}/replay"))
        .await;
    assert_eq!(status, 200);
    assert_eq!(body["replayed"], 1);
    assert_eq!(
        body["deliveryIds"].as_array().expect("deliveryIds").len(),
        1
    );

    let rows = fixture.deliveries_for_event(&event_id).await;
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].1, subscribed, "fanout must skip {unsubscribed}");
    assert_eq!(rows[0].2, "pending");

    fixture.cleanup().await;
}

#[tokio::test]
async fn replaying_an_unknown_event_returns_404() {
    let fixture = fixture_or_skip!();
    fixture.seed_endpoint(None).await;
    let key = fixture.create_key(&["*"]).await;

    let missing = uuid::Uuid::new_v4();
    let (status, body) = fixture
        .post_empty(&key, &format!("/webhooks/events/{missing}/replay"))
        .await;
    assert_eq!(status, 404);
    assert_eq!(body["error"]["message"], "Event not found");

    fixture.cleanup().await;
}
