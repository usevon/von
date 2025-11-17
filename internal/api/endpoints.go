package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/usevon/von/internal/service"
)

// EndpointsHandler serves HTTP requests for webhook endpoint management.
type EndpointsHandler struct {
	endpointService service.EndpointService
}

// NewEndpointsHandler returns a new endpoints handler.
func NewEndpointsHandler(endpointService service.EndpointService) *EndpointsHandler {
	return &EndpointsHandler{
		endpointService: endpointService,
	}
}

// CreateEndpointRequest contains the parameters for creating a new webhook endpoint.
type CreateEndpointRequest struct {
	ApplicationID  string            `json:"application_id"`
	URL            string            `json:"url"`
	Description    string            `json:"description,omitempty"`
	SigningAlgo    string            `json:"signing_algo,omitempty"`
	EventFilters   []string          `json:"event_filters,omitempty"`
	FilterMode     string            `json:"filter_mode,omitempty"`
	CustomHeaders  map[string]string `json:"custom_headers,omitempty"`
	TimeoutSeconds int               `json:"timeout_seconds,omitempty"`
	RetryStrategy  string            `json:"retry_strategy,omitempty"`
	MaxRetries     int               `json:"max_retries,omitempty"`
}

// UpdateEndpointRequest contains the parameters for updating an existing webhook endpoint.
type UpdateEndpointRequest struct {
	URL            *string           `json:"url,omitempty"`
	Description    *string           `json:"description,omitempty"`
	EventFilters   []string          `json:"event_filters,omitempty"`
	FilterMode     *string           `json:"filter_mode,omitempty"`
	CustomHeaders  map[string]string `json:"custom_headers,omitempty"`
	TimeoutSeconds *int              `json:"timeout_seconds,omitempty"`
	MaxRetries     *int              `json:"max_retries,omitempty"`
	Status         *string           `json:"status,omitempty"`
}

// CreateEndpoint creates a new webhook endpoint.
func (h *EndpointsHandler) CreateEndpoint(w http.ResponseWriter, r *http.Request) {
	var req CreateEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	endpoint, err := h.endpointService.CreateEndpoint(r.Context(), &service.CreateEndpointRequest{
		ApplicationID:  req.ApplicationID,
		URL:            req.URL,
		Description:    req.Description,
		SigningAlgo:    req.SigningAlgo,
		EventFilters:   req.EventFilters,
		FilterMode:     req.FilterMode,
		CustomHeaders:  req.CustomHeaders,
		TimeoutSeconds: req.TimeoutSeconds,
		RetryStrategy:  req.RetryStrategy,
		MaxRetries:     req.MaxRetries,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidRequest):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, service.ErrInvalidURL):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, service.ErrApplicationNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		default:
			http.Error(w, "Failed to create endpoint", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(endpoint)
}

// ListEndpoints lists all endpoints for an application.
func (h *EndpointsHandler) ListEndpoints(w http.ResponseWriter, r *http.Request) {
	appID := r.URL.Query().Get("application_id")
	if appID == "" {
		http.Error(w, "application_id query parameter is required", http.StatusBadRequest)
		return
	}

	endpoints, err := h.endpointService.ListEndpointsByApplication(r.Context(), appID)
	if err != nil {
		http.Error(w, "Failed to fetch endpoints", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"endpoints": endpoints,
	})
}

// GetEndpoint retrieves a single endpoint by ID.
func (h *EndpointsHandler) GetEndpoint(w http.ResponseWriter, r *http.Request) {
	endpointID := chi.URLParam(r, "id")

	endpoint, err := h.endpointService.GetEndpoint(r.Context(), endpointID)
	if err != nil {
		if errors.Is(err, service.ErrEndpointNotFound) {
			http.Error(w, "Endpoint not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to fetch endpoint", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(endpoint)
}

// UpdateEndpoint updates an existing endpoint.
func (h *EndpointsHandler) UpdateEndpoint(w http.ResponseWriter, r *http.Request) {
	endpointID := chi.URLParam(r, "id")

	var req UpdateEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	endpoint, err := h.endpointService.UpdateEndpoint(r.Context(), endpointID, &service.UpdateEndpointRequest{
		URL:            req.URL,
		Description:    req.Description,
		EventFilters:   req.EventFilters,
		FilterMode:     req.FilterMode,
		CustomHeaders:  req.CustomHeaders,
		TimeoutSeconds: req.TimeoutSeconds,
		MaxRetries:     req.MaxRetries,
		Status:         req.Status,
	})
	if err != nil {
		if errors.Is(err, service.ErrEndpointNotFound) {
			http.Error(w, "Endpoint not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to update endpoint", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(endpoint)
}

// DeleteEndpoint deletes an endpoint.
func (h *EndpointsHandler) DeleteEndpoint(w http.ResponseWriter, r *http.Request) {
	endpointID := chi.URLParam(r, "id")

	if err := h.endpointService.DeleteEndpoint(r.Context(), endpointID); err != nil {
		if errors.Is(err, service.ErrEndpointNotFound) {
			http.Error(w, "Endpoint not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete endpoint", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Endpoint deleted successfully",
	})
}
