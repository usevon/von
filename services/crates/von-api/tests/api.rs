//! Drives the real router over HTTP against a live Postgres and Redis, pinning
//! the auth boundary, endpoint CRUD shapes, and cursor pagination the dashboard relies on.

mod support;
use serde_json::json;
use support::{Fixture, SAFE_URL, is_iso_millis};

#[tokio::test]
async fn badly_signed_key_is_rejected_despite_a_matching_row() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_badly_signed_key().await;

    let (status, body) = fixture.get(&key, "/endpoints").await;
    assert_eq!(status, 401);
    assert_eq!(body["error"]["message"], "api key not found or disabled");

    fixture.cleanup().await;
}

#[tokio::test]
async fn disabled_key_is_rejected() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_disabled_key(&["*"]).await;

    let (status, body) = fixture.get(&key, "/endpoints").await;
    assert_eq!(status, 401);
    assert_eq!(body["error"]["message"], "api key not found or disabled");

    fixture.cleanup().await;
}

#[tokio::test]
async fn read_scope_reads_but_cannot_write() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["read:endpoints"]).await;

    let (status, _) = fixture.get(&key, "/endpoints").await;
    assert_eq!(status, 200);

    let (status, body) = fixture
        .post(&key, "/endpoints", json!({ "url": SAFE_URL }))
        .await;
    assert_eq!(status, 403);
    assert_eq!(
        body["error"]["message"],
        "API key lacks required scope write:endpoints"
    );

    fixture.cleanup().await;
}

#[tokio::test]
async fn action_wildcard_scopes_grant_both_directions() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };

    let reader = fixture.create_key(&["read:*"]).await;
    let (status, _) = fixture.get(&reader, "/endpoints").await;
    assert_eq!(status, 200);
    let (status, _) = fixture
        .post(&reader, "/endpoints", json!({ "url": SAFE_URL }))
        .await;
    assert_eq!(status, 403);

    let full = fixture.create_key(&["read:*", "write:*"]).await;
    let (status, _) = fixture.get(&full, "/endpoints").await;
    assert_eq!(status, 200);
    let (status, _) = fixture
        .post(&full, "/endpoints", json!({ "url": SAFE_URL }))
        .await;
    assert_eq!(status, 201);

    fixture.cleanup().await;
}

#[tokio::test]
async fn bearer_scheme_is_case_insensitive() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["read:endpoints"]).await;

    let lower = fixture
        .get_with_auth_header(&format!("bearer {key}"), "/endpoints")
        .await;
    assert_eq!(lower, 200);

    let upper = fixture
        .get_with_auth_header(&format!("BEARER {key}"), "/endpoints")
        .await;
    assert_eq!(upper, 200);

    fixture.cleanup().await;
}

#[tokio::test]
async fn create_returns_camel_case_iso_timestamps_and_the_secret_once() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let (status, body) = fixture
        .post(
            &key,
            "/endpoints",
            json!({
                "url": SAFE_URL,
                "description": "primary hook",
                "version": "2024-01-01",
                "maxAttempts": 5,
                "timeoutMs": 5000,
                "events": ["order.paid"],
            }),
        )
        .await;
    assert_eq!(status, 201);

    assert!(body["id"].is_string());
    assert_eq!(body["url"], SAFE_URL);
    assert_eq!(body["status"], "active");
    assert_eq!(body["version"], "2024-01-01");
    assert_eq!(body["maxAttempts"], 5);
    assert_eq!(body["timeoutMs"], 5000);
    assert_eq!(body["events"], json!(["order.paid"]));
    assert!(body["lastSuccessAt"].is_null());
    assert!(body.get("max_attempts").is_none(), "keys must be camelCase");

    let created_at = body["createdAt"].as_str().expect("createdAt");
    let updated_at = body["updatedAt"].as_str().expect("updatedAt");
    assert!(is_iso_millis(created_at), "createdAt was {created_at}");
    assert!(is_iso_millis(updated_at), "updatedAt was {updated_at}");

    let secret = body["secret"].as_str().expect("secret");
    assert!(secret.starts_with("whsec_"));

    // The plaintext secret appears at create only, a read must never echo it.
    let id = body["id"].as_str().expect("id");
    let (status, fetched) = fixture.get(&key, &format!("/endpoints/{id}")).await;
    assert_eq!(status, 200);
    assert!(fetched.get("secret").is_none());

    fixture.cleanup().await;
}

#[tokio::test]
async fn update_version_is_three_state() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let (_, created) = fixture
        .post(
            &key,
            "/endpoints",
            json!({ "url": SAFE_URL, "version": "2024-01-01" }),
        )
        .await;
    let id = created["id"].as_str().expect("id").to_owned();
    let path = format!("/endpoints/{id}");

    let (status, body) = fixture
        .patch(&key, &path, json!({ "description": "renamed" }))
        .await;
    assert_eq!(status, 200);
    assert_eq!(
        body["version"], "2024-01-01",
        "omitting version must keep it"
    );

    let (status, body) = fixture.patch(&key, &path, json!({ "version": null })).await;
    assert_eq!(status, 200);
    assert!(
        body["version"].is_null(),
        "an explicit null version must clear it"
    );

    let (status, body) = fixture
        .patch(&key, &path, json!({ "version": "2025-06-01" }))
        .await;
    assert_eq!(status, 200);
    assert_eq!(body["version"], "2025-06-01");

    fixture.cleanup().await;
}

#[tokio::test]
async fn validation_errors_return_exact_messages() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    for attempts in [0, 11] {
        let (status, body) = fixture
            .post(
                &key,
                "/endpoints",
                json!({ "url": SAFE_URL, "maxAttempts": attempts }),
            )
            .await;
        assert_eq!(status, 400);
        assert_eq!(
            body["error"]["message"],
            "maxAttempts must be between 1 and 10"
        );
    }

    for timeout in [999, 60_001] {
        let (status, body) = fixture
            .post(
                &key,
                "/endpoints",
                json!({ "url": SAFE_URL, "timeoutMs": timeout }),
            )
            .await;
        assert_eq!(status, 400);
        assert_eq!(
            body["error"]["message"],
            "timeoutMs must be between 1000 and 60000"
        );
    }

    fixture.cleanup().await;
}

#[tokio::test]
async fn rotate_returns_the_new_and_previous_secret() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let (_, created) = fixture
        .post(&key, "/endpoints", json!({ "url": SAFE_URL }))
        .await;
    let id = created["id"].as_str().expect("id");
    let original = created["secret"].as_str().expect("secret").to_owned();

    let (status, body) = fixture
        .post_empty(&key, &format!("/endpoints/{id}/rotate"))
        .await;
    assert_eq!(status, 200);
    assert_eq!(body["previousSecret"], original);
    let rotated = body["secret"].as_str().expect("secret");
    assert!(rotated.starts_with("whsec_"));
    assert_ne!(rotated, original);

    fixture.cleanup().await;
}

#[tokio::test]
async fn delete_succeeds_and_a_later_get_returns_404() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let (_, created) = fixture
        .post(&key, "/endpoints", json!({ "url": SAFE_URL }))
        .await;
    let id = created["id"].as_str().expect("id");
    let path = format!("/endpoints/{id}");

    let (status, body) = fixture.delete(&key, &path).await;
    assert_eq!(status, 200);
    assert_eq!(body["success"], true);

    let (status, body) = fixture.get(&key, &path).await;
    assert_eq!(status, 404);
    assert_eq!(body["error"]["message"], "Endpoint not found");

    fixture.cleanup().await;
}

#[tokio::test]
async fn cursor_pagination_walks_without_duplicates_or_gaps() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let mut created = Vec::new();
    for index in 0..5 {
        let (status, body) = fixture
            .post(
                &key,
                "/endpoints",
                json!({ "url": format!("{SAFE_URL}/{index}") }),
            )
            .await;
        assert_eq!(status, 201);
        created.push(body["id"].as_str().expect("id").to_owned());
    }
    fixture.stagger_endpoint_created_at(&created).await;

    let mut seen = Vec::new();
    let mut cursor: Option<String> = None;
    let mut pages = 0;
    loop {
        let path = match &cursor {
            Some(cursor) => format!("/endpoints?limit=2&cursor={cursor}"),
            None => "/endpoints?limit=2".to_owned(),
        };
        let (status, body) = fixture.get(&key, &path).await;
        assert_eq!(status, 200);
        pages += 1;
        for endpoint in body["endpoints"].as_array().expect("endpoints") {
            seen.push(endpoint["id"].as_str().expect("id").to_owned());
        }
        match body["nextCursor"].as_str() {
            Some(next) => cursor = Some(next.to_owned()),
            None => break,
        }
        assert!(pages < 10, "cursor never terminated");
    }

    assert_eq!(pages, 3);
    assert_eq!(seen.len(), 5, "walk must cover every row exactly once");
    let mut sorted_seen = seen.clone();
    sorted_seen.sort();
    sorted_seen.dedup();
    assert_eq!(sorted_seen.len(), 5, "walk must not repeat a row");
    let mut sorted_created = created.clone();
    sorted_created.sort();
    assert_eq!(sorted_seen, sorted_created, "walk must not skip a row");

    fixture.cleanup().await;
}

#[tokio::test]
async fn cursors_are_scope_bound_and_tamper_proof() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let mut created = Vec::new();
    for index in 0..3 {
        let (status, body) = fixture
            .post(
                &key,
                "/endpoints",
                json!({ "url": format!("{SAFE_URL}/{index}") }),
            )
            .await;
        assert_eq!(status, 201);
        created.push(body["id"].as_str().expect("id").to_owned());
    }
    fixture.stagger_endpoint_created_at(&created).await;

    let (status, body) = fixture.get(&key, "/endpoints?limit=2").await;
    assert_eq!(status, 200);
    let cursor = body["nextCursor"].as_str().expect("nextCursor").to_owned();

    // A cursor minted for endpoints must not open a page of another resource.
    let (status, body) = fixture
        .get(&key, &format!("/inbound?limit=2&cursor={cursor}"))
        .await;
    assert_eq!(status, 400);
    assert_eq!(body["error"]["message"], "Invalid cursor");

    let last = cursor.chars().last().expect("last char");
    let flipped = if last == '0' { "1" } else { "0" };
    let tampered = format!("{}{flipped}", &cursor[..cursor.len() - 1]);
    let (status, body) = fixture
        .get(&key, &format!("/endpoints?limit=2&cursor={tampered}"))
        .await;
    assert_eq!(status, 400);
    assert_eq!(body["error"]["message"], "Invalid cursor");

    fixture.cleanup().await;
}

/// The revocation channel must evict the cached tenant well inside the 10s TTL.
#[tokio::test]
async fn revoked_key_stops_working_once_invalidation_is_published() {
    let Some(fixture) = Fixture::new().await else {
        return;
    };
    let key = fixture.create_key(&["*"]).await;

    let (status, _) = fixture.get(&key, "/endpoints").await;
    assert_eq!(status, 200);

    sqlx::query("UPDATE apikey SET enabled = false WHERE organization_id = $1::uuid")
        .bind(&fixture.organization_id)
        .execute(&fixture.pool)
        .await
        .expect("disable key");
    let mut conn = fixture.redis.clone();
    let _: redis::RedisResult<i64> = redis::cmd("PUBLISH")
        .arg("von:auth:invalidate")
        .arg(&fixture.organization_id)
        .query_async(&mut conn)
        .await;

    let mut revoked = false;
    for _ in 0..40 {
        if fixture.get(&key, "/endpoints").await.0 == 401 {
            revoked = true;
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    assert!(
        revoked,
        "the revoked key kept working past the invalidation"
    );

    fixture.cleanup().await;
}
