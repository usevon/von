package util

import "github.com/usevon/von/pkg/types"

// Application option functions

// WithAppID sets the application ID
func WithAppID(id string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.ID = id
	}
}

// WithOrganizationID sets the organization ID
func WithOrganizationID(orgID string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.OrganizationID = orgID
	}
}

// WithAppName sets the application name
func WithAppName(name string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.Name = name
	}
}

// WithAppUID sets the application UID
func WithAppUID(uid string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.UID = uid
	}
}

// WithAppDescription sets the application description
func WithAppDescription(desc string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.Description = desc
	}
}

// Endpoint option functions

// WithEndpointID sets the endpoint ID
func WithEndpointID(id string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.ID = id
	}
}

// WithApplicationID sets the application ID for an endpoint
func WithApplicationID(appID string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.ApplicationID = appID
	}
}

// WithEndpointUID sets the endpoint UID
func WithEndpointUID(uid string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.UID = uid
	}
}

// WithURL sets the endpoint URL
func WithURL(url string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.URL = url
	}
}

// WithSecret sets the endpoint secret (current key)
func WithSecret(secret string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.Secrets = types.JSONB{"current": secret}
	}
}

// WithSecrets sets custom endpoint secrets
func WithSecrets(secrets types.JSONB) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.Secrets = secrets
	}
}

// WithSigningAlgo sets the signing algorithm
func WithSigningAlgo(algo types.SignatureAlgo) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.SigningAlgo = algo
	}
}

// WithEndpointStatus sets the endpoint status
func WithEndpointStatus(status types.EndpointStatus) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.Status = status
	}
}

// WithHealthScore sets the endpoint health score
func WithHealthScore(score int) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.HealthScore = score
	}
}

// WithRetryStrategy sets the retry strategy
func WithRetryStrategy(strategy types.RetryStrategy) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.RetryStrategy = strategy
	}
}

// WithMaxRetries sets max retries for endpoints
func WithEndpointMaxRetries(max int) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.MaxRetries = max
	}
}

// WithTimeoutSeconds sets the endpoint timeout
func WithTimeoutSeconds(timeout int) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.TimeoutSeconds = timeout
	}
}

// WithFilterMode sets the endpoint filter mode
func WithFilterMode(mode types.FilterMode) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.FilterMode = mode
	}
}

// WithDescription sets the endpoint description
func WithDescription(desc string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.Description = desc
	}
}

// WithEventFilters sets the event filters for the endpoint
func WithEventFilters(filters types.JSONB) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.EventFilters = filters
	}
}

// Event option functions

// WithEventID sets the event ID
func WithEventID(id string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.ID = id
	}
}

// WithEventApplicationID sets the application ID for an event
func WithEventApplicationID(appID string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.ApplicationID = appID
	}
}

// WithEventOrganizationID sets the organization ID for an event
func WithEventOrganizationID(orgID string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.OrganizationID = orgID
	}
}

// WithEventTypeForEvent sets the event type for Event entity
func WithEventTypeForEvent(eventType string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.EventType = eventType
	}
}

// WithEventVersion sets the event version
func WithEventVersion(version string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.EventVersion = version
	}
}

// WithEventPayload sets the event payload
func WithEventPayload(payload types.JSONB) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.Payload = payload
	}
}

// WithDeliveryMode sets the delivery mode
func WithDeliveryMode(mode types.DeliveryMode) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.DeliveryMode = mode
	}
}

// Delivery option functions

// WithDeliveryIDForDelivery sets the delivery ID for EventDelivery entity
func WithDeliveryIDForDelivery(id string) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.ID = id
	}
}

// WithEventIDForDelivery sets the event ID for a delivery
func WithEventIDForDelivery(eventID string) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.EventID = eventID
	}
}

// WithEndpointIDForDelivery sets the endpoint ID for a delivery
func WithEndpointIDForDelivery(endpointID string) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.EndpointID = endpointID
	}
}

// WithDeliveryStatus sets the delivery status
func WithDeliveryStatus(status types.DeliveryStatus) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.Status = status
	}
}

// WithAttemptCount sets the delivery attempt count
func WithAttemptCount(count int) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.AttemptCount = count
	}
}

// WithMaxAttempts sets max delivery attempts
func WithMaxAttempts(max int) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.MaxAttempts = max
	}
}
