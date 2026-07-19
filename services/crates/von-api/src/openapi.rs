use crate::error::{ErrorBody, ErrorResponse, SuccessResponse};
use crate::modules::analytics::model::{
    Overview, OverviewRates, OverviewTotals, Retries, RetriesByAttempt, RetriesRates,
    RetriesTotals, Timeseries, TimeseriesBucket, TimeseriesInterval,
};
use crate::modules::analytics::routes as analytics_routes;

use crate::modules::endpoints::model::{
    CreateEndpoint, Endpoint, EndpointList, EndpointStatus, EndpointWithSecret, RotateResponse,
    TestEndpointBody, TestResponse, UpdateEndpoint,
};
use crate::modules::endpoints::routes;
use crate::modules::inbound::model::{
    CreateInboundEndpoint, InboundEndpoint, InboundEndpointList, UpdateInboundEndpoint,
};
use crate::modules::inbound::routes as inbound_routes;
use crate::modules::tunnel::model::{
    RegisterResponse, RegisterTunnel, RotateResponse as TunnelRotateResponse, TunnelList,
};
use crate::modules::tunnel::routes as tunnel_routes;
use crate::modules::versions::model::{
    CreateVersion, TransformMappings, UpdateVersion, VersionList, WebhookVersion,
};
use crate::modules::versions::routes as version_routes;
use crate::modules::webhooks::model::{
    Delivery, DeliveryAttempt, DeliveryAttemptList, DeliveryList, EventList, WebhookEvent,
};
use crate::modules::webhooks::routes as webhook_routes;
use utoipa::openapi::security::{Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi};

struct BearerAuth;

impl Modify for BearerAuth {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.add_security_scheme(
            "bearerAuth",
            SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
        );
    }
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "von API",
        version = "0.1.0",
        description = "Control plane for von webhook endpoints."
    ),
    paths(
        routes::list,
        routes::get_one,
        routes::create,
        routes::update,
        routes::remove,
        routes::test,
        routes::rotate,
        routes::clear_previous,
        version_routes::list,
        version_routes::get_one,
        version_routes::create,
        version_routes::update,
        version_routes::remove,

        tunnel_routes::register,
        tunnel_routes::rotate,
        tunnel_routes::list,

        inbound_routes::list,
        inbound_routes::get_one,
        inbound_routes::create,
        inbound_routes::update,
        inbound_routes::remove,

        webhook_routes::list_events,
        webhook_routes::get_event,
        webhook_routes::list_deliveries,
        webhook_routes::list_attempts,

        analytics_routes::overview,
        analytics_routes::timeseries,
        analytics_routes::retries,
    ),
    components(schemas(
        CreateEndpoint,
        UpdateEndpoint,
        Endpoint,
        EndpointStatus,
        EndpointWithSecret,
        EndpointList,
        TestEndpointBody,
        TestResponse,
        RotateResponse,
        CreateVersion,
        UpdateVersion,
        WebhookVersion,
        VersionList,
        TransformMappings,
        WebhookEvent,
        EventList,
        Delivery,
        DeliveryList,
        DeliveryAttempt,
        DeliveryAttemptList,
        CreateInboundEndpoint,
        UpdateInboundEndpoint,
        InboundEndpoint,
        InboundEndpointList,
        RegisterTunnel,
        RegisterResponse,
        TunnelRotateResponse,
        TunnelList,

        Overview,
        OverviewTotals,
        OverviewRates,
        Timeseries,
        TimeseriesBucket,
        TimeseriesInterval,
        Retries,
        RetriesTotals,
        RetriesRates,
        RetriesByAttempt,
        SuccessResponse,
        ErrorResponse,
        ErrorBody,
    )),
    modifiers(&BearerAuth),
    tags(
        (name = "endpoints", description = "Webhook endpoint management"),
        (name = "versions", description = "Webhook payload transform versions"),
        (name = "webhooks", description = "Event, delivery and attempt history"),
        (name = "inbound", description = "Inbound endpoints that forward to your services"),
        (name = "tunnels", description = "Local development tunnels"),

        (name = "analytics", description = "Delivery and retry aggregates")
    )
)]
pub struct ApiDoc;
