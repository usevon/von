use crate::auth::Auth;
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::sync::Arc;

pub struct ApiState {
    pub pool: PgPool,
    pub redis: ConnectionManager,
    pub auth: Arc<Auth>,
}

pub type Shared = Arc<ApiState>;
