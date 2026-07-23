//! Checks the inbound forwarder polls pending rows, forwards, signs, and records the result.

mod support;
use support::{Fixture, Probe, signature_matches};

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
async fn inbound_forwards_a_pending_delivery_and_signs_it() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(0).await;
    let endpoint_id = fixture.create_inbound_endpoint(&probe.url).await;
    let delivery_id = fixture
        .enqueue_inbound(&endpoint_id, r#"{"scenario":"inbound"}"#)
        .await;

    let settled = fixture
        .settle_inbound_until(async || {
            fixture.inbound_status(&delivery_id).await.as_deref() == Some("forwarded")
        })
        .await;
    assert!(settled, "inbound delivery was never forwarded");
    assert_eq!(probe.hits().len(), 1);

    let (body, signature, _) = probe.last().expect("a recorded hit");
    assert!(
        signature_matches(&signature, &body, &fixture.secret),
        "signature did not verify over the forwarded body"
    );
}

/// A pending inbound delivery whose lease has not expired must not be forwarded early, then must
/// forward once it is due.
#[tokio::test]
async fn inbound_recovers_a_leased_delivery() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(0).await;
    let endpoint_id = fixture.create_inbound_endpoint(&probe.url).await;
    let delivery_id = fixture
        .enqueue_inbound(&endpoint_id, r#"{"scenario":"inbound-lease"}"#)
        .await;

    sqlx::query("UPDATE inbound_delivery SET next_attempt_at = now() + make_interval(secs => 3600) WHERE id = $1::uuid")
        .bind(&delivery_id)
        .execute(&fixture.pool)
        .await
        .expect("lease");
    let _ = fixture.inbound.tick().await;
    assert!(probe.hits().is_empty(), "a leased inbound delivery was forwarded early");

    sqlx::query("UPDATE inbound_delivery SET next_attempt_at = now() - make_interval(secs => 1) WHERE id = $1::uuid")
        .bind(&delivery_id)
        .execute(&fixture.pool)
        .await
        .expect("expire lease");
    let settled = fixture
        .settle_inbound_until(async || {
            fixture.inbound_status(&delivery_id).await.as_deref() == Some("forwarded")
        })
        .await;
    assert!(settled, "inbound delivery was not recovered after its lease expired");
    assert_eq!(probe.hits().len(), 1);
}
