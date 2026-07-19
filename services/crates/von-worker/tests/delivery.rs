//! Drives the flusher and delivery loops against a real Postgres and Redis with a
//! local endpoint that can be told to fail a fixed number of times.

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
async fn delivers_signs_and_records_one_attempt() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(0).await;
    fixture.create_endpoint(&probe.url, 3).await;

    let event_id = fixture.enqueue_event(r#"{"scenario":"happy"}"#).await;

    let settled = fixture
        .settle_until(async || {
            fixture.delivery_status(&event_id).await.as_deref() == Some("success")
        })
        .await;
    assert!(settled, "delivery never reached success");
    assert!(
        fixture.event_exists(&event_id).await,
        "event was not persisted"
    );

    assert_eq!(probe.hits().len(), 1, "endpoint should be called once");
    let (body, signature, event_type) = probe.last().expect("a recorded hit");
    assert_eq!(event_type, "worker.probe");
    assert!(
        signature_matches(&signature, &body, &fixture.secret),
        "signature did not verify over the delivered body"
    );

    let attempts = fixture.attempts(&event_id).await;
    assert_eq!(attempts.len(), 1);
    assert_eq!(attempts[0].attempt_number, 1);
    assert_eq!(attempts[0].outcome, "success");
    assert_eq!(attempts[0].http_status, Some(200));

    fixture.cleanup().await;
}

#[tokio::test]
async fn retries_then_succeeds_without_gaps_in_attempt_numbers() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(2).await;
    fixture.create_endpoint(&probe.url, 3).await;

    let event_id = fixture.enqueue_event(r#"{"scenario":"retry"}"#).await;

    let settled = fixture
        .settle_until(async || {
            fixture.delivery_status(&event_id).await.as_deref() == Some("success")
        })
        .await;
    assert!(settled, "delivery never recovered after two failures");
    assert_eq!(probe.hits().len(), 3);

    let attempts = fixture.attempts(&event_id).await;
    let numbers: Vec<i32> = attempts.iter().map(|a| a.attempt_number).collect();
    assert_eq!(numbers, vec![1, 2, 3], "attempt numbers must not skip");
    assert_eq!(attempts[0].outcome, "failure");
    assert_eq!(attempts[2].outcome, "success");

    let (failures, circuit) = fixture.endpoint_circuit().await;
    assert_eq!(failures, 0, "success must reset the failure count");
    assert_eq!(circuit, "closed");

    fixture.cleanup().await;
}

#[tokio::test]
async fn stops_at_max_attempts_and_marks_only_the_last_final() {
    let fixture = fixture_or_skip!();
    let probe = Probe::start(usize::MAX).await;
    fixture.create_endpoint(&probe.url, 3).await;

    let event_id = fixture.enqueue_event(r#"{"scenario":"exhaust"}"#).await;

    let settled = fixture
        .settle_until(async || {
            fixture.delivery_status(&event_id).await.as_deref() == Some("failed")
        })
        .await;
    assert!(settled, "delivery never gave up");

    assert_eq!(fixture.delivery_attempts_column(&event_id).await, 3);
    assert_eq!(probe.hits().len(), 3, "must not exceed max_attempts");

    let attempts = fixture.attempts(&event_id).await;
    let finals: Vec<bool> = attempts.iter().map(|a| a.is_final).collect();
    assert_eq!(finals, vec![false, false, true]);

    fixture.cleanup().await;
}
