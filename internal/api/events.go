package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// EventsHandler serves HTTP requests for webhook event creation and management.
type EventsHandler struct {
	db        *gorm.DB
	publisher WebhookPublisher
}

// NewEventsHandler returns a new events handler with the given database and publisher.
func NewEventsHandler(db *gorm.DB, publisher WebhookPublisher) *EventsHandler {
	return &EventsHandler{
		db:        db,
		publisher: publisher,
	}
}

// CreateEventRequest contains the parameters for creating a new webhook event.
type CreateEventRequest struct {
	ApplicationID string                 `json:"application_id"`
	EventType     string                 `json:"event_type"`
	EventVersion  string                 `json:"event_version,omitempty"`
	Payload       map[string]interface{} `json:"payload"`
	DeliveryMode  string                 `json:"delivery_mode,omitempty"`
}

// CreateEventResponse contains the result of creating a webhook event.
type CreateEventResponse struct {
	EventID      string   `json:"event_id"`
	DeliveryIDs  []string `json:"delivery_ids"`
	EndpointCount int     `json:"endpoint_count"`
	QueuedAt     int64    `json:"queued_at"`
}

// CreateEvent creates a new webhook event and queues deliveries to matching endpoints.
func (h *EventsHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var req CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		BadRequest(w, "Invalid request body")
		return
	}

	if req.ApplicationID == "" {
		BadRequest(w, "application_id is required")
		return
	}

	if req.EventType == "" {
		BadRequest(w, "event_type is required")
		return
	}

	if req.Payload == nil || len(req.Payload) == 0 {
		BadRequest(w, "payload is required")
		return
	}

	var app types.Application
	if err := h.db.Where("id = ?", req.ApplicationID).First(&app).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			NotFound(w, "Application not found")
		} else {
			InternalError(w, "Failed to fetch application")
		}
		return
	}

	deliveryMode := types.DeliveryModeAsync
	if req.DeliveryMode == string(types.DeliveryModeSync) {
		deliveryMode = types.DeliveryModeSync
	}

	event := types.Event{
		ID:             uuid.New().String(),
		ApplicationID:  req.ApplicationID,
		OrganizationID: app.OrganizationID,
		EventType:      req.EventType,
		EventVersion:   req.EventVersion,
		Payload:        req.Payload,
		DeliveryMode:   deliveryMode,
		CreatedAt:      time.Now(),
	}

	payloadBytes, _ := json.Marshal(req.Payload)
	event.PayloadSize = len(payloadBytes)

	if err := h.db.Create(&event).Error; err != nil {
		InternalError(w, "Failed to create event")
		return
	}

	var endpoints []types.Endpoint
	query := h.db.Where("application_id = ? AND status != ?", req.ApplicationID, types.EndpointStatusDisabled)

	if err := query.Find(&endpoints).Error; err != nil {
		InternalError(w, "Failed to fetch endpoints")
		return
	}

	matchingEndpoints := make([]types.Endpoint, 0)
	for _, endpoint := range endpoints {
		if h.eventMatchesEndpoint(&event, &endpoint) {
			matchingEndpoints = append(matchingEndpoints, endpoint)
		}
	}

	deliveryIDs := make([]string, 0, len(matchingEndpoints))
	ctx := context.Background()

	for _, endpoint := range matchingEndpoints {
		delivery := types.EventDelivery{
			ID:          uuid.New().String(),
			EventID:     event.ID,
			EndpointID:  endpoint.ID,
			Status:      types.DeliveryStatusQueued,
			MaxAttempts: endpoint.MaxRetries,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := h.db.Create(&delivery).Error; err != nil {
			continue
		}

		deliveryIDs = append(deliveryIDs, delivery.ID)

		msg := types.NewQueueMessage(&event, &endpoint, &delivery)

		if err := h.publisher.PublishWebhook(ctx, msg); err != nil {
			h.db.Model(&delivery).Update("status", types.DeliveryStatusFailed)
		}
	}

	Created(w, CreateEventResponse{
		EventID:       event.ID,
		DeliveryIDs:   deliveryIDs,
		EndpointCount: len(deliveryIDs),
		QueuedAt:      time.Now().Unix(),
	})
}

// eventMatchesEndpoint reports whether the event matches the endpoint's filter configuration.
func (h *EventsHandler) eventMatchesEndpoint(event *types.Event, endpoint *types.Endpoint) bool {
	if len(endpoint.EventFilters) == 0 {
		return endpoint.FilterMode == types.FilterModeAllow
	}

	filtersInterface, ok := endpoint.EventFilters["filters"]
	if !ok {
		return endpoint.FilterMode == types.FilterModeAllow
	}

	filters, ok := filtersInterface.([]interface{})
	if !ok {
		return endpoint.FilterMode == types.FilterModeAllow
	}

	for _, filter := range filters {
		if filterStr, ok := filter.(string); ok && filterStr == event.EventType {
			return endpoint.FilterMode == types.FilterModeAllow
		}
	}

	return endpoint.FilterMode == types.FilterModeBlock
}
