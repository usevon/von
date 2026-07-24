use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct RegisterTunnel {
    #[schema(minimum = 1, maximum = 65535, example = 3000)]
    pub port: i32,
}

#[derive(Deserialize, ToSchema)]
pub struct RotateTunnel {
    #[schema(minimum = 1, maximum = 65535, example = 3000)]
    pub port: i32,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RegisterResponse {
    pub tunnel_id: String,
    pub secret: String,
    pub url: String,
    pub ws_url: String,
}

#[derive(Serialize, ToSchema)]
pub struct RotateResponse {
    pub secret: String,
}

#[derive(Serialize, ToSchema)]
pub struct TunnelList {
    pub tunnels: Vec<String>,
}
