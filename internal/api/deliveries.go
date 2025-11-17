package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/usevon/von/internal/service"
)

// DeliveriesHandler serves HTTP requests for webhook delivery management.
type DeliveriesHandler struct {
	deliveryService service.DeliveryService
}

// NewDeliveriesHandler returns a new deliveries handler.
func NewDeliveriesHandler(deliveryService service.DeliveryService) *DeliveriesHandler {
	return &DeliveriesHandler{
		deliveryService: deliveryService,
	}
}

// ListDeliveries lists deliveries with optional filters.
func (h *DeliveriesHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	filters := &service.DeliveryFilters{
		EventID:    r.URL.Query().Get("event_id"),
		EndpointID: r.URL.Query().Get("endpoint_id"),
		Status:     r.URL.Query().Get("status"),
	}

	deliveries, err := h.deliveryService.ListDeliveries(r.Context(), filters)
	if err != nil {
		http.Error(w, "Failed to fetch deliveries", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deliveries": deliveries,
	})
}

// GetDelivery retrieves a single delivery by ID.
func (h *DeliveriesHandler) GetDelivery(w http.ResponseWriter, r *http.Request) {
	deliveryID := chi.URLParam(r, "id")

	delivery, err := h.deliveryService.GetDelivery(r.Context(), deliveryID)
	if err != nil {
		if errors.Is(err, service.ErrDeliveryNotFound) {
			http.Error(w, "Delivery not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to fetch delivery", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(delivery)
}

// GetDeliveryAttempts lists all attempts for a delivery.
func (h *DeliveriesHandler) GetDeliveryAttempts(w http.ResponseWriter, r *http.Request) {
	deliveryID := chi.URLParam(r, "id")

	attempts, err := h.deliveryService.GetDeliveryAttempts(r.Context(), deliveryID)
	if err != nil {
		http.Error(w, "Failed to fetch delivery attempts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"attempts": attempts,
	})
}

// RetryDelivery manually retries a failed delivery.
func (h *DeliveriesHandler) RetryDelivery(w http.ResponseWriter, r *http.Request) {
	deliveryID := chi.URLParam(r, "id")

	if err := h.deliveryService.RetryDelivery(r.Context(), deliveryID); err != nil {
		switch {
		case errors.Is(err, service.ErrDeliveryNotFound):
			http.Error(w, "Delivery not found", http.StatusNotFound)
		case errors.Is(err, service.ErrCannotRetryDelivery):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, service.ErrEndpointDisabled):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "Failed to queue retry", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":     "Delivery queued for retry",
		"delivery_id": deliveryID,
		"queued_at":   time.Now().Unix(),
	})
}
