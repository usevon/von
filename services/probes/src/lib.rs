// Shared helpers for the floor probes.

/// Builds a realistic webhook payload of roughly the target size, repetitive
/// structure with seed-varied ids so compression ratios are honest.
pub fn payload_json_seeded(target_bytes: usize, seed: u64) -> String {
    if target_bytes == 0 {
        return r#"{"ts":1}"#.to_owned();
    }
    let mut rng = seed.wrapping_mul(0x9e3779b97f4a7c15).wrapping_add(1);
    let mut next = move || {
        rng ^= rng << 13;
        rng ^= rng >> 7;
        rng ^= rng << 17;
        rng
    };
    let mut items = String::new();
    let mut i = 0usize;
    while items.len() + 220 < target_bytes {
        if i > 0 {
            items.push(',');
        }
        let r = next();
        items.push_str(&format!(
            r#"{{"sku":"SKU-{:06}","qty":{},"price":{}.99,"name":"Widget model {}","warehouse":"us-east-{}","tags":["priority","gift-wrap"],"meta":{{"batch":"b-{:016x}","weight_g":{}}}}}"#,
            r % 900_000,
            r % 7 + 1,
            r % 90 + 9,
            r % 4096,
            r % 4 + 1,
            next(),
            r % 900 + 100,
        ));
        i += 1;
    }
    format!(
        r#"{{"orderId":"ord_{:016x}","currency":"usd","customer":{{"id":"cus_{:016x}","email":"buyer{}@example.com"}},"items":[{items}]}}"#,
        next(),
        next(),
        next() % 100_000,
    )
}

pub fn payload_json(target_bytes: usize) -> String {
    payload_json_seeded(target_bytes, 7)
}

pub fn pct(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((sorted.len() as f64 * p) as usize).min(sorted.len() - 1);
    sorted[idx]
}

pub fn mbps(bytes: usize, ops: usize, secs: f64) -> f64 {
    (bytes as f64 * ops as f64 / secs) / (1024.0 * 1024.0)
}
