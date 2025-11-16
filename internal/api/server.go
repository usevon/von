package api

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/usevon/von/pkg/types"
	vonmiddleware "github.com/usevon/von/internal/middleware"
	"gorm.io/gorm"
)

// WebhookPublisher publishes webhook messages to the queue.
type WebhookPublisher interface {
	PublishWebhook(ctx context.Context, msg types.QueueMessage) error
	Close()
}

// Server serves the webhook HTTP API.
type Server struct {
	db        *gorm.DB
	publisher WebhookPublisher
	router    *chi.Mux
}

// NewServer returns a new API server with the given database and publisher.
func NewServer(db *gorm.DB, publisher WebhookPublisher) *Server {
	s := &Server{
		db:        db,
		publisher: publisher,
		router:    chi.NewRouter(),
	}

	s.setupRoutes()
	return s
}

// setupRoutes registers all API routes and middleware.
func (s *Server) setupRoutes() {
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.RealIP)
	s.router.Use(middleware.Logger)
	s.router.Use(middleware.Recoverer)
	s.router.Use(middleware.Timeout(60 * time.Second))
	s.router.Use(vonmiddleware.IdempotencyMiddleware(s.db))

	s.router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		Success(w, map[string]string{"status": "ok"})
	})

	eventsHandler := NewEventsHandler(s.db, s.publisher)
	endpointsHandler := NewEndpointsHandler(s.db)
	deliveriesHandler := NewDeliveriesHandler(s.db, s.publisher)

	s.router.Route("/v1", func(r chi.Router) {
		r.Post("/events", eventsHandler.CreateEvent)

		r.Route("/endpoints", func(r chi.Router) {
			r.Get("/", endpointsHandler.ListEndpoints)
			r.Post("/", endpointsHandler.CreateEndpoint)

			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", endpointsHandler.GetEndpoint)
				r.Put("/", endpointsHandler.UpdateEndpoint)
				r.Delete("/", endpointsHandler.DeleteEndpoint)
			})
		})

		r.Route("/deliveries", func(r chi.Router) {
			r.Get("/", deliveriesHandler.ListDeliveries)

			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", deliveriesHandler.GetDelivery)
				r.Get("/attempts", deliveriesHandler.GetDeliveryAttempts)
				r.Post("/retry", deliveriesHandler.RetryDelivery)
			})
		})
	})
}

// Start starts the HTTP server on the specified address.
func (s *Server) Start(addr string) error {
	log.Printf("API server starting on %s", addr)
	return http.ListenAndServe(addr, s.router)
}

// Handler returns the HTTP handler for the server.
func (s *Server) Handler() http.Handler {
	return s.router
}
