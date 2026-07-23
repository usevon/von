use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{mpsc, oneshot, watch};

#[derive(Serialize, Deserialize, Debug)]
pub struct TunnelRequest {
    pub id: String,
    pub method: String,
    pub path: String,
    pub headers: std::collections::HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TunnelResponse {
    pub request_id: String,
    pub status: u16,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
}

pub struct Connection {
    pub outbound: mpsc::Sender<String>,
    pub pending: DashMap<String, oneshot::Sender<TunnelResponse>>,
    pub organization_id: String,
    pub user_id: String,
    pub shutdown: watch::Sender<bool>,
}

impl Connection {
    /// Dropping the senders wakes every waiter instead of leaving them to time out.
    pub fn fail_pending(&self) {
        self.pending.retain(|_, _| false);
    }
}

/// Live sockets held by this process, redis records which instance owns each id.
#[derive(Default)]
pub struct Registry {
    connections: DashMap<String, Arc<Connection>>,
}

impl Registry {
    pub fn get(&self, tunnel_id: &str) -> Option<Arc<Connection>> {
        self.connections.get(tunnel_id).map(|c| c.clone())
    }

    pub fn insert(
        &self,
        tunnel_id: String,
        connection: Arc<Connection>,
    ) -> Option<Arc<Connection>> {
        self.connections.insert(tunnel_id, connection)
    }

    pub fn remove(&self, tunnel_id: &str) -> Option<Arc<Connection>> {
        self.connections.remove(tunnel_id).map(|(_, c)| c)
    }

    /// A superseded connection must not tear down its replacement, so removal only
    /// happens when the map still holds this exact connection.
    pub fn remove_if_same(&self, tunnel_id: &str, connection: &Arc<Connection>) -> bool {
        self.connections
            .remove_if(tunnel_id, |_, existing| Arc::ptr_eq(existing, connection))
            .is_some()
    }
}
