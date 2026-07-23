use tracing_subscriber::EnvFilter;

pub fn init() {
    let filter = EnvFilter::try_from_env("LOG_LEVEL").unwrap_or_else(|_| EnvFilter::new("info"));

    let json = std::env::var("LOG_FORMAT").is_ok_and(|format| format.eq_ignore_ascii_case("json"));

    let builder = tracing_subscriber::fmt().with_env_filter(filter);
    if json {
        builder.json().flatten_event(true).init();
    } else {
        builder.with_target(false).init();
    }
}
