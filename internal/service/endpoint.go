package service

import (
	"context"
	"errors"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/repository"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

var (
	ErrInvalidURL          = errors.New("invalid url format")
	ErrApplicationNotFound = errors.New("application not found")
	ErrEndpointNotFound    = errors.New("endpoint not found")
	ErrInvalidRequest      = errors.New("invalid request")
)

// parseEnum parses a string value to an enum type with a default fallback.
func parseEnum[T ~string](value string, defaultVal T) T {
	if value == "" {
		return defaultVal
	}
	return T(value)
}

// withDefault returns the provided value if it's greater than zero, otherwise returns the default.
func withDefault(value, defaultVal int) int {
	if value > 0 {
		return value
	}
	return defaultVal
}

type endpointService struct {
	db   *gorm.DB
	repo repository.EndpointRepository
}

// NewEndpointService creates a new endpoint service.
func NewEndpointService(db *gorm.DB, repo repository.EndpointRepository) EndpointService {
	return &endpointService{
		db:   db,
		repo: repo,
	}
}

func (s *endpointService) CreateEndpoint(ctx context.Context, req *CreateEndpointRequest) (*types.Endpoint, error) {
	if req.ApplicationID == "" || req.URL == "" {
		return nil, ErrInvalidRequest
	}

	parsedURL, err := url.ParseRequestURI(req.URL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, ErrInvalidURL
	}

	var app types.Application
	if err := s.db.Where("id = ?", req.ApplicationID).First(&app).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrApplicationNotFound
		}
		return nil, err
	}

	signingAlgo := parseEnum(req.SigningAlgo, types.SignatureAlgoSHA256)
	filterMode := parseEnum(req.FilterMode, types.FilterModeAllow)
	retryStrategy := parseEnum(req.RetryStrategy, types.RetryStrategyExponential)
	timeoutSeconds := withDefault(req.TimeoutSeconds, 30)
	maxRetries := withDefault(req.MaxRetries, 3)

	eventFilters := types.JSONB{}
	if len(req.EventFilters) > 0 {
		eventFilters["filters"] = req.EventFilters
	}

	customHeaders := types.JSONB{}
	for k, v := range req.CustomHeaders {
		customHeaders[k] = v
	}

	endpoint := &types.Endpoint{
		ID:             uuid.New().String(),
		ApplicationID:  req.ApplicationID,
		UID:            "ep_" + uuid.New().String()[:8],
		URL:            req.URL,
		Description:    req.Description,
		SigningAlgo:    signingAlgo,
		Secrets:        types.JSONB{"current": uuid.New().String()},
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

	if err := s.repo.Create(ctx, endpoint); err != nil {
		return nil, err
	}

	return endpoint, nil
}

func (s *endpointService) GetEndpoint(ctx context.Context, id string) (*types.Endpoint, error) {
	endpoint, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrEndpointNotFound
		}
		return nil, err
	}
	return endpoint, nil
}

func (s *endpointService) ListEndpointsByApplication(ctx context.Context, appID string) ([]types.Endpoint, error) {
	return s.repo.ListByApplicationID(ctx, appID)
}

func (s *endpointService) UpdateEndpoint(ctx context.Context, id string, req *UpdateEndpointRequest) (*types.Endpoint, error) {
	endpoint, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrEndpointNotFound
		}
		return nil, err
	}

	if req.URL != nil {
		endpoint.URL = *req.URL
	}
	if req.Description != nil {
		endpoint.Description = *req.Description
	}
	if req.EventFilters != nil {
		endpoint.EventFilters = types.JSONB{"filters": req.EventFilters}
	}
	if req.FilterMode != nil {
		endpoint.FilterMode = types.FilterMode(*req.FilterMode)
	}
	if req.CustomHeaders != nil {
		customHeaders := types.JSONB{}
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
		endpoint.Status = types.EndpointStatus(*req.Status)
	}

	endpoint.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, endpoint); err != nil {
		return nil, err
	}

	return endpoint, nil
}

func (s *endpointService) DeleteEndpoint(ctx context.Context, id string) error {
	err := s.repo.Delete(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrEndpointNotFound
		}
		return err
	}
	return nil
}
