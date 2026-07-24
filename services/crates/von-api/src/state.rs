use crate::auth::Auth;
use crate::modules::tunnel::connection::Connection;
use dashmap::DashMap;
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::sync::Arc;

pub struct ApiState {
    pub pool: PgPool,
    pub redis: ConnectionManager,
    pub auth: Arc<Auth>,
    pub tunnels: DashMap<String, Arc<Connection>>,
    pub instance_id: String,
}

pub type Shared = Arc<ApiState>;
