//! Locks the delivery guarantees the Postgres-queue migration must preserve, plus the reclaim path.

mod support;
use support::{Fixture, Probe};

use support::fixture_or_skip;

/// Two events sharing an idempotency key collapse to one event, so the duplicate's delivery
/// must never reach the endpoint.
#[tokio::test]
async fn deduped_event_is_not_delivered() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(0).await;
    fixture.create_endpoint(&probe.url, 3).await;

    let key = format!("dedupe-{}", uuid::Uuid::new_v4());
    let first = fixture.enqueue_event_with_key(r#"{"n":1}"#, &key).await;
    let second = fixture.enqueue_event_with_key(r#"{"n":2}"#, &key).await;

    let settled = fixture
        .settle_until(async || !probe.hits().is_empty())
        .await;
    assert!(settled, "the deduped event never delivered");

    assert_eq!(
        probe.hits().len(),
        1,
        "the duplicate was delivered a second time"
    );
    assert!(
        fixture.event_exists(&first).await ^ fixture.event_exists(&second).await,
        "exactly one of the two events must persist"
    );

    fixture.cleanup().await;
}

/// One event fanned out to two endpoints must deliver to both, which the coalescer builds
/// as two delivery rows behind one event.
#[tokio::test]
async fn fanout_delivers_to_every_endpoint() {
    let fixture = fixture_or_skip!();
    let first = Probe::start(0).await;
    let second = Probe::start(0).await;

    let second_id = uuid::Uuid::new_v4().to_string();
    let secret = format!("whsec_{}", uuid::Uuid::new_v4());
    fixture.create_endpoint(&first.url, 3).await;
    fixture
        .create_endpoint_with(&second_id, &second.url, &secret, 3)
        .await;

    let event_id = fixture
        .enqueue_fanout(
            r#"{"scenario":"fanout"}"#,
            &[fixture.endpoint_id.clone(), second_id],
        )
        .await;

    let settled = fixture
        .settle_until(async || !first.hits().is_empty() && !second.hits().is_empty())
        .await;
    assert!(settled, "fanout did not reach both endpoints");
    assert!(fixture.event_exists(&event_id).await);
    assert_eq!(first.hits().len(), 1);
    assert_eq!(second.hits().len(), 1);

    fixture.cleanup().await;
}

/// A delivery a dead worker claimed must not be taken again until its lease expires, then it
/// must deliver, so a crash mid-delivery never strands the row.
#[tokio::test]
async fn a_leased_delivery_recovers_once_its_lease_expires() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(0).await;
    fixture.create_endpoint(&probe.url, 3).await;

    let event_id = fixture.enqueue_event(r#"{"scenario":"lease"}"#).await;

    // Persist the pending row, then simulate a worker that claimed it and died by pushing
    // next_attempt_at into the future.
    let _ = fixture.flusher.tick().await;
    fixture.set_next_attempt(&event_id, 3600).await;

    let _ = fixture.worker.tick().await;
    assert!(
        probe.hits().is_empty(),
        "a leased delivery was taken before its lease expired"
    );

    // Once the lease expires the row is pollable again and delivers.
    fixture.set_next_attempt(&event_id, -1).await;
    let settled = fixture
        .settle_until(async || {
            fixture.delivery_status(&event_id).await.as_deref() == Some("delivered")
        })
        .await;
    assert!(
        settled,
        "the delivery was not recovered after its lease expired"
    );
    assert_eq!(probe.hits().len(), 1);

    fixture.cleanup().await;
}
