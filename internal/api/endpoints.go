package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// EndpointsHandler serves HTTP requests for webhook endpoint management.
type EndpointsHandler struct {
	db *gorm.DB
}

// NewEndpointsHandler returns a new endpoints handler with the given database.
func NewEndpointsHandler(db *gorm.DB) *EndpointsHandler {
	return &EndpointsHandler{db: db}
}

// CreateEndpointRequest contains the parameters for creating a new webhook endpoint.
type CreateEndpointRequest struct {
	ApplicationID  string              `json:"application_id"`
	URL            string              `json:"url"`
	Description    string              `json:"description,omitempty"`
	SigningAlgo    string              `json:"signing_algo,omitempty"`
	EventFilters   []string            `json:"event_filters,omitempty"`
	FilterMode     string              `json:"filter_mode,omitempty"`
	CustomHeaders  map[string]string   `json:"custom_headers,omitempty"`
	TimeoutSeconds int                 `json:"timeout_seconds,omitempty"`
	RetryStrategy  string              `json:"retry_strategy,omitempty"`
	MaxRetries     int                 `json:"max_retries,omitempty"`
}

// UpdateEndpointRequest contains the parameters for updating an existing webhook endpoint.
type UpdateEndpointRequest struct {
	URL            *string             `json:"url,omitempty"`
	Description    *string             `json:"description,omitempty"`
	EventFilters   []string            `json:"event_filters,omitempty"`
	FilterMode     *string             `json:"filter_mode,omitempty"`
	CustomHeaders  map[string]string   `json:"custom_headers,omitempty"`
	TimeoutSeconds *int                `json:"timeout_seconds,omitempty"`
	MaxRetries     *int                `json:"max_retries,omitempty"`
	Status         *string             `json:"status,omitempty"`
}

// CreateEndpoint creates a new webhook endpoint.
func (h *EndpointsHandler) CreateEndpoint(w http.ResponseWriter, r *http.Request) {
	var req CreateEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		BadRequest(w, "Invalid request body")
		return
	}

	if req.ApplicationID == "" {
		BadRequest(w, "application_id is required")
		return
	}

	if req.URL == "" {
		BadRequest(w, "url is required")
		return
	}

	// Validate URL format
	parsedURL, err := url.ParseRequestURI(req.URL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		BadRequest(w, "invalid url format")
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

	signingAlgo := types.SignatureAlgoSHA256
	if req.SigningAlgo == string(types.SignatureAlgoSHA512) {
		signingAlgo = types.SignatureAlgoSHA512
	}

	filterMode := types.FilterModeAllow
	if req.FilterMode == string(types.FilterModeBlock) {
		filterMode = types.FilterModeBlock
	}

	retryStrategy := types.RetryStrategyExponential
	if req.RetryStrategy == string(types.RetryStrategyLinear) {
		retryStrategy = types.RetryStrategyLinear
	} else if req.RetryStrategy == string(types.RetryStrategyConstant) {
		retryStrategy = types.RetryStrategyConstant
	}

	timeoutSeconds := 30
	if req.TimeoutSeconds > 0 {
		timeoutSeconds = req.TimeoutSeconds
	}

	maxRetries := 3
	if req.MaxRetries >= 0 {
		maxRetries = req.MaxRetries
	}

	secret := uuid.New().String()

	eventFilters := make(types.JSONB)
	if len(req.EventFilters) > 0 {
		filters := make([]interface{}, len(req.EventFilters))
		for i, f := range req.EventFilters {
			filters[i] = f
		}
		eventFilters["filters"] = filters
	}

	customHeaders := make(types.JSONB)
	for k, v := range req.CustomHeaders {
		customHeaders[k] = v
	}

	endpoint := types.Endpoint{
		ID:             uuid.New().String(),
		ApplicationID:  req.ApplicationID,
		UID:            "ep_" + uuid.New().String()[:8],
		URL:            req.URL,
		Description:    req.Description,
		SigningAlgo:    signingAlgo,
		Secrets:        types.JSONB{"current": secret},
		EventFilters:   eventFilters,
		FilterMode:     filterMode,
		Status:         types.EndpointStatusHealthy,
		HealthScore:    100,
		CustomHeaders:  customHeaders,
		TimeoutSeconds: timeoutSeconds,
		RetryStrategy:  retryStrategy,
		MaxRetries:     maxRetries,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := h.db.Create(&endpoint).Error; err != nil {
		InternalError(w, "Failed to create endpoint")
		return
	}

	Created(w, endpoint)
}

// ListEndpoints lists all endpoints for an application.
func (h *EndpointsHandler) ListEndpoints(w http.ResponseWriter, r *http.Request) {
	appID := r.URL.Query().Get("application_id")
	if appID == "" {
		BadRequest(w, "application_id query parameter is required")
		return
	}

	var endpoints []types.Endpoint
	if err := h.db.Where("application_id = ?", appID).Order("created_at DESC").Find(&endpoints).Error; err != nil {
		InternalError(w, "Failed to fetch endpoints")
		return
	}

	Success(w, map[string]interface{}{
		"endpoints": endpoints,
	})
}

// GetEndpoint retrieves a single endpoint by ID.
func (h *EndpointsHandler) GetEndpoint(w http.ResponseWriter, r *http.Request) {
	endpointID := chi.URLParam(r, "id")

	var endpoint types.Endpoint
	if err := h.db.Where("id = ?", endpointID).First(&endpoint).Error; err != nil {
		if err == gorm.ErrRecordNotFound || isInvalidUUIDError(err) {
			NotFound(w, "Endpoint not found")
		} else {
			InternalError(w, "Failed to fetch endpoint")
		}
		return
	}

	Success(w, endpoint)
}

// UpdateEndpoint updates an existing endpoint.
func (h *EndpointsHandler) UpdateEndpoint(w http.ResponseWriter, r *http.Request) {
	endpointID := chi.URLParam(r, "id")

	var endpoint types.Endpoint
	if err := h.db.Where("id = ?", endpointID).First(&endpoint).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			NotFound(w, "Endpoint not found")
		} else {
			InternalError(w, "Failed to fetch endpoint")
		}
		return
	}

	var req UpdateEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		BadRequest(w, "Invalid request body")
		return
	}

	if req.URL != nil {
		endpoint.URL = *req.URL
	}
	if req.Description != nil {
		endpoint.Description = *req.Description
	}
	if req.EventFilters != nil {
		eventFilters := make(types.JSONB)
		filters := make([]interface{}, len(req.EventFilters))
		for i, f := range req.EventFilters {
			filters[i] = f
		}
		eventFilters["filters"] = filters
		endpoint.EventFilters = eventFilters
	}
	if req.FilterMode != nil {
		if *req.FilterMode == string(types.FilterModeAllow) {
			endpoint.FilterMode = types.FilterModeAllow
		} else if *req.FilterMode == string(types.FilterModeBlock) {
			endpoint.FilterMode = types.FilterModeBlock
		}
	}
	if req.CustomHeaders != nil {
		customHeaders := make(types.JSONB)
		for k, v := range req.CustomHeaders {
			customHeaders[k] = v
		}
		endpoint.CustomHeaders = customHeaders
	}
	if req.TimeoutSeconds != nil {
		endpoint.TimeoutSeconds = *req.TimeoutSeconds
	}
	if req.MaxRetries != nil {
		endpoint.MaxRetries = *req.MaxRetries
	}
	if req.Status != nil {
		switch *req.Status {
		case string(types.EndpointStatusHealthy):
			endpoint.Status = types.EndpointStatusHealthy
		case string(types.EndpointStatusDisabled):
			endpoint.Status = types.EndpointStatusDisabled
		}
	}

	endpoint.UpdatedAt = time.Now()

	if err := h.db.Save(&endpoint).Error; err != nil {
		InternalError(w, "Failed to update endpoint")
		return
	}

	Success(w, endpoint)
}

// DeleteEndpoint deletes an endpoint.
func (h *EndpointsHandler) DeleteEndpoint(w http.ResponseWriter, r *http.Request) {
	endpointID := chi.URLParam(r, "id")

	result := h.db.Where("id = ?", endpointID).Delete(&types.Endpoint{})
	if result.Error != nil {
		if isInvalidUUIDError(result.Error) {
			NotFound(w, "Endpoint not found")
		} else {
			InternalError(w, "Failed to delete endpoint")
		}
		return
	}

	if result.RowsAffected == 0 {
		NotFound(w, "Endpoint not found")
		return
	}

	Success(w, map[string]interface{}{
		"message": "Endpoint deleted successfully",
	})
}
