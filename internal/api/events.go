package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/usevon/von/internal/service"
)

// EventsHandler serves HTTP requests for webhook event creation and management.
type EventsHandler struct {
	eventService service.EventService
}

// NewEventsHandler returns a new events handler.
func NewEventsHandler(eventService service.EventService) *EventsHandler {
	return &EventsHandler{
		eventService: eventService,
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
	EventID       string   `json:"event_id"`
	DeliveryIDs   []string `json:"delivery_ids"`
	EndpointCount int      `json:"endpoint_count"`
	QueuedAt      int64    `json:"queued_at"`
}

// CreateEvent creates a new webhook event and queues deliveries to matching endpoints.
func (h *EventsHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var req CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result, err := h.eventService.CreateEvent(r.Context(), &service.CreateEventRequest{
		ApplicationID: req.ApplicationID,
		EventType:     req.EventType,
		EventVersion:  req.EventVersion,
		Payload:       req.Payload,
		DeliveryMode:  req.DeliveryMode,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidRequest):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, service.ErrApplicationNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		default:
			http.Error(w, "Failed to create event", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateEventResponse{
		EventID:       result.EventID,
		DeliveryIDs:   result.DeliveryIDs,
		EndpointCount: result.EndpointCount,
		QueuedAt:      result.QueuedAt,
	})
}
