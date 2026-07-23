#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("missing or malformed authorization header")]
    MissingCredentials,

    #[error("api key not found or disabled")]
    InvalidApiKey,

    #[error("API key lacks required scope {0}")]
    InsufficientScope(String),

    #[error("monthly delivery quota exceeded (used {used} of {limit})")]
    QuotaExceeded { used: i64, limit: i64 },

    #[error("rate limit exceeded for organization {0}")]
    RateLimited(String),

    #[error("payload is {actual} bytes, over the {limit} byte limit")]
    PayloadTooLarge { limit: usize, actual: usize },

    #[error("redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("the coalescer dropped the request before it was flushed")]
    FlushDropped,

    #[error("service is shutting down")]
    Shutdown,

    #[error("{0}")]
    BadRequest(String),

    #[error("{0} not found")]
    NotFound(String),

    #[error("{0}")]
    Configuration(String),
}

impl Error {
    pub fn status_code(&self) -> u16 {
        match self {
            Self::MissingCredentials | Self::InvalidApiKey => 401,
            Self::InsufficientScope(_) => 403,
            Self::QuotaExceeded { .. } | Self::RateLimited(_) => 429,
            Self::PayloadTooLarge { .. } => 413,
            Self::BadRequest(_) => 400,
            Self::NotFound(_) => 404,
            // Infrastructure blips are retryable outages, not caller mistakes.
            Self::Shutdown | Self::Redis(_) | Self::Database(_) => 503,
            _ => 500,
        }
    }

    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::Redis(_) | Self::Database(_) | Self::FlushDropped | Self::Shutdown
        )
    }
}

pub type Result<T> = std::result::Result<T, Error>;
