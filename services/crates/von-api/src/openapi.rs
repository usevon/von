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
use crate::modules::versions::model::{
    CreateVersion, TransformMappings, UpdateVersion, VersionList, WebhookVersion,
};
use crate::modules::versions::routes as version_routes;
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

        (name = "analytics", description = "Delivery and retry aggregates")
    )
)]
pub struct ApiDoc;
