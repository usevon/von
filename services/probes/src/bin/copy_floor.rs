// In-process serialize and compression floor over the real BufferedEntry format.
// Gates the compression decision, prints MB/s and ratio per codec and level.

use std::time::Instant;
use von_types::{BufferedDelivery, BufferedEntry, BufferedEvent};

fn build_entry(payload_bytes: usize, events: usize) -> BufferedEntry {
    let now = "2026-01-01T00:00:00.000000000+00:00".to_owned();
    let mut evs = Vec::with_capacity(events);
    let mut dels = Vec::with_capacity(events);
    for i in 0..events {
        let payload = von_probes::payload_json_seeded(payload_bytes, i as u64 + 1);
        let event_id = uuid::Uuid::new_v4().to_string();
        evs.push(BufferedEvent {
            id: event_id.clone(),
            organization_id: "d20c84de-2f73-4ff2-9e2b-463f4b39d6a7".to_owned(),
            event_type: format!("order.created.{}", i % 3),
            payload: serde_json::value::RawValue::from_string(payload).unwrap(),
            idempotency_key: Some(uuid::Uuid::new_v4().to_string()),
            created_at: now.clone(),
        });
        dels.push(BufferedDelivery {
            id: uuid::Uuid::new_v4().to_string(),
            organization_id: "d20c84de-2f73-4ff2-9e2b-463f4b39d6a7".to_owned(),
            event_id,
            endpoint_id: uuid::Uuid::new_v4().to_string(),
            status: "pending".to_owned(),
            attempts: 0,
            created_at: now.clone(),
        });
    }
    BufferedEntry {
        events: evs,
        deliveries: dels,
    }
}

fn time_mbps(bytes: usize, iters: usize, f: impl Fn()) -> f64 {
    let t0 = Instant::now();
    for _ in 0..iters {
        f();
    }
    (bytes as f64 * iters as f64 / t0.elapsed().as_secs_f64()) / (1024.0 * 1024.0)
}

fn main() {
    println!(
        "{:>22}  {:>9}  {:>12}  {:>7}  {:>12}",
        "shape", "json", "codec", "ratio", "MB/s enc/dec"
    );
    for (label, payload_bytes, events) in [
        ("1KB x 100 events", 1024, 100),
        ("16KB x 60 events", 16 * 1024, 60),
        ("64KB x 15 events", 64 * 1024, 15),
        ("256KB x 3 events", 256 * 1024, 3),
    ] {
        let entry = build_entry(payload_bytes, events);
        let json = serde_json::to_string(&entry).unwrap();
        let bytes = json.as_bytes();
        let iters = (256 * 1024 * 1024 / bytes.len()).clamp(3, 200);

        let ser = time_mbps(bytes.len(), iters, || {
            let _ = serde_json::to_string(&entry).unwrap();
        });
        println!(
            "{label:>22}  {:>7.2}MB  {:>12}  {:>7}  {ser:>8.0} enc",
            bytes.len() as f64 / (1024.0 * 1024.0),
            "serialize",
            "1.00x",
        );

        for level in [1, 3] {
            let z = zstd::encode_all(bytes, level).unwrap();
            let enc = time_mbps(bytes.len(), iters, || {
                let _ = zstd::encode_all(bytes, level).unwrap();
            });
            let dec = time_mbps(bytes.len(), iters, || {
                let _ = zstd::decode_all(&z[..]).unwrap();
            });
            println!(
                "{:>22}  {:>9}  {:>12}  {:>6.2}x  {enc:>8.0} / {dec:.0}",
                "",
                "",
                format!("zstd-{level}"),
                bytes.len() as f64 / z.len() as f64,
            );
        }

        let l4 = lz4_flex::compress_prepend_size(bytes);
        let enc = time_mbps(bytes.len(), iters, || {
            let _ = lz4_flex::compress_prepend_size(bytes);
        });
        let dec = time_mbps(bytes.len(), iters, || {
            let _ = lz4_flex::decompress_size_prepended(&l4).unwrap();
        });
        println!(
            "{:>22}  {:>9}  {:>12}  {:>6.2}x  {enc:>8.0} / {dec:.0}",
            "",
            "",
            "lz4",
            bytes.len() as f64 / l4.len() as f64,
        );
    }
}
