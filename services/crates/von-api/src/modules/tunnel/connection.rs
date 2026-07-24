use dashmap::DashMap;
use serde::{Deserialize, Serialize};
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
    pub fn fail_pending(&self) {
        self.pending.retain(|_, _| false);
    }
}
