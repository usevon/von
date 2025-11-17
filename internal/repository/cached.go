package repository

import (
	"context"
	"sync"
	"time"

	"github.com/usevon/von/pkg/types"
)

// cachedEndpointRepo wraps an EndpointRepository with an in-memory cache.
type cachedEndpointRepo struct {
	base  EndpointRepository
	cache sync.Map // map[string]*cacheEntry
	ttl   time.Duration
}

type cacheEntry struct {
	endpoint  *types.Endpoint
	expiresAt time.Time
}

// NewCachedEndpointRepo creates a cached endpoint repository.
func NewCachedEndpointRepo(base EndpointRepository, ttl time.Duration, maxSize int) EndpointRepository {
	return &cachedEndpointRepo{
		base: base,
		ttl:  ttl,
	}
}

func (r *cachedEndpointRepo) GetByID(ctx context.Context, id string) (*types.Endpoint, error) {
	if val, ok := r.cache.Load(id); ok {
		entry := val.(*cacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.endpoint, nil
		}
		r.cache.Delete(id)
	}

	endpoint, err := r.base.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	r.cache.Store(id, &cacheEntry{
		endpoint:  endpoint,
		expiresAt: time.Now().Add(r.ttl),
	})

	return endpoint, nil
}

func (r *cachedEndpointRepo) ListByApplicationID(ctx context.Context, appID string, status ...types.EndpointStatus) ([]types.Endpoint, error) {
	return r.base.ListByApplicationID(ctx, appID, status...)
}

func (r *cachedEndpointRepo) Create(ctx context.Context, endpoint *types.Endpoint) error {
	return r.base.Create(ctx, endpoint)
}

func (r *cachedEndpointRepo) Update(ctx context.Context, endpoint *types.Endpoint) error {
	err := r.base.Update(ctx, endpoint)
	if err != nil {
		return err
	}

	r.cache.Delete(endpoint.ID)

	return nil
}

func (r *cachedEndpointRepo) Delete(ctx context.Context, id string) error {
	err := r.base.Delete(ctx, id)
	if err != nil {
		return err
	}

	r.cache.Delete(id)

	return nil
}

func (r *cachedEndpointRepo) UpdateHealth(ctx context.Context, id string, health *types.EndpointHealth) error {
	return r.base.UpdateHealth(ctx, id, health)
}
