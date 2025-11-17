package cache

import (
	"context"
	"sync"
	"time"

	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// CachedEndpoint contains frequently accessed endpoint configuration.
// Caching this data eliminates a database query on every webhook delivery.
type CachedEndpoint struct {
	Status         types.EndpointStatus
	Secrets        types.JSONB
	CustomHeaders  types.JSONB
	MaxRetries     int
	RetryStrategy  types.RetryStrategy
	TimeoutSeconds int
	CachedAt       time.Time
}

// EndpointCache provides an in-memory LRU cache for endpoint configurations.
// Reduces database load by caching frequently accessed endpoint data with TTL.
type EndpointCache struct {
	db         *gorm.DB
	cache      map[string]*CachedEndpoint
	mu         sync.RWMutex
	ttl        time.Duration
	maxEntries int
}

// NewEndpointCache creates a new endpoint cache with the specified TTL and max entries.
func NewEndpointCache(db *gorm.DB, ttl time.Duration, maxEntries int) *EndpointCache {
	return &EndpointCache{
		db:         db,
		cache:      make(map[string]*CachedEndpoint),
		ttl:        ttl,
		maxEntries: maxEntries,
	}
}

// Get retrieves an endpoint from cache or database.
// Returns the cached endpoint if valid, otherwise fetches from DB and caches it.
func (c *EndpointCache) Get(ctx context.Context, endpointID string) (*CachedEndpoint, error) {
	// Check cache first
	c.mu.RLock()
	cached, exists := c.cache[endpointID]
	c.mu.RUnlock()

	if exists && time.Since(cached.CachedAt) < c.ttl {
		return cached, nil
	}

	// Cache miss or expired, fetch from database
	var endpoint types.Endpoint
	if err := c.db.WithContext(ctx).
		Select("status", "secrets", "custom_headers", "max_retries", "retry_strategy", "timeout_seconds").
		Where("id = ?", endpointID).
		First(&endpoint).Error; err != nil {
		return nil, err
	}

	// Create cached entry
	entry := &CachedEndpoint{
		Status:         endpoint.Status,
		Secrets:        endpoint.Secrets,
		CustomHeaders:  endpoint.CustomHeaders,
		MaxRetries:     endpoint.MaxRetries,
		RetryStrategy:  endpoint.RetryStrategy,
		TimeoutSeconds: endpoint.TimeoutSeconds,
		CachedAt:       time.Now(),
	}

	// Store in cache
	c.mu.Lock()
	// Simple LRU: if cache is full, clear it
	if len(c.cache) >= c.maxEntries {
		c.cache = make(map[string]*CachedEndpoint)
	}
	c.cache[endpointID] = entry
	c.mu.Unlock()

	return entry, nil
}

// Invalidate removes an endpoint from the cache.
// Call this when an endpoint is updated to ensure fresh data on next access.
func (c *EndpointCache) Invalidate(endpointID string) {
	c.mu.Lock()
	delete(c.cache, endpointID)
	c.mu.Unlock()
}

// Clear removes all entries from the cache.
func (c *EndpointCache) Clear() {
	c.mu.Lock()
	c.cache = make(map[string]*CachedEndpoint)
	c.mu.Unlock()
}

// Size returns the current number of cached entries.
func (c *EndpointCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.cache)
}
