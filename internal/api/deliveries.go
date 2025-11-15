package api

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

type DeliveriesHandler struct {
	db        *gorm.DB
	publisher *queue.Publisher
}

func NewDeliveriesHandler(db *gorm.DB, publisher *queue.Publisher) *DeliveriesHandler {
	return &DeliveriesHandler{
		db:        db,
		publisher: publisher,
	}
}

func (h *DeliveriesHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	eventID := r.URL.Query().Get("event_id")
	endpointID := r.URL.Query().Get("endpoint_id")
	status := r.URL.Query().Get("status")

	query := h.db.Model(&types.EventDelivery{})

	if eventID != "" {
		query = query.Where("event_id = ?", eventID)
	}
	if endpointID != "" {
		query = query.Where("endpoint_id = ?", endpointID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var deliveries []types.EventDelivery
	if err := query.Order("created_at DESC").Limit(100).Find(&deliveries).Error; err != nil {
		InternalError(w, "Failed to fetch deliveries")
		return
	}

	Success(w, deliveries)
}

func (h *DeliveriesHandler) GetDelivery(w http.ResponseWriter, r *http.Request) {
	deliveryID := chi.URLParam(r, "id")

	var delivery types.EventDelivery
	if err := h.db.Where("id = ?", deliveryID).First(&delivery).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			NotFound(w, "Delivery not found")
		} else {
			InternalError(w, "Failed to fetch delivery")
		}
		return
	}

	Success(w, delivery)
}

func (h *DeliveriesHandler) GetDeliveryAttempts(w http.ResponseWriter, r *http.Request) {
	deliveryID := chi.URLParam(r, "id")

	var attempts []types.DeliveryAttempt
	if err := h.db.Where("delivery_id = ?", deliveryID).Order("attempt_number ASC").Find(&attempts).Error; err != nil {
		InternalError(w, "Failed to fetch delivery attempts")
		return
	}

	Success(w, attempts)
}

func (h *DeliveriesHandler) RetryDelivery(w http.ResponseWriter, r *http.Request) {
	deliveryID := chi.URLParam(r, "id")

	var delivery types.EventDelivery
	if err := h.db.Where("id = ?", deliveryID).First(&delivery).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			NotFound(w, "Delivery not found")
		} else {
			InternalError(w, "Failed to fetch delivery")
		}
		return
	}

	if delivery.Status.IsTerminal() && delivery.Status != types.DeliveryStatusFailed {
		BadRequest(w, "Cannot retry delivery that is not failed")
		return
	}

	var event types.Event
	if err := h.db.Where("id = ?", delivery.EventID).First(&event).Error; err != nil {
		InternalError(w, "Failed to fetch event")
		return
	}

	var endpoint types.Endpoint
	if err := h.db.Where("id = ?", delivery.EndpointID).First(&endpoint).Error; err != nil {
		InternalError(w, "Failed to fetch endpoint")
		return
	}

	if endpoint.Status == types.EndpointStatusDisabled {
		BadRequest(w, "Cannot retry delivery to disabled endpoint")
		return
	}

	delivery.Status = types.DeliveryStatusQueued
	delivery.NextAttemptAt = nil
	delivery.UpdatedAt = time.Now()

	if err := h.db.Save(&delivery).Error; err != nil {
		InternalError(w, "Failed to update delivery")
		return
	}

	secret := "default-secret"
	if currentSecret, ok := endpoint.Secrets["current"].(string); ok {
		secret = currentSecret
	}

	headers := make(map[string]string)
	for k, v := range endpoint.CustomHeaders {
		if str, ok := v.(string); ok {
			headers[k] = str
		}
	}

	msg := types.QueueMessage{
		DeliveryID:    delivery.ID,
		EventID:       event.ID,
		EndpointID:    endpoint.ID,
		URL:           endpoint.URL,
		EventType:     event.EventType,
		Payload:       event.Payload,
		Headers:       headers,
		Secret:        secret,
		AttemptNumber: delivery.AttemptCount + 1,
		DeliveryMode:  event.DeliveryMode,
		MaxRetries:    endpoint.MaxRetries,
		RetryStrategy: endpoint.RetryStrategy,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()
	if err := h.publisher.PublishWebhook(ctx, msg); err != nil {
		InternalError(w, "Failed to queue retry")
		return
	}

	Success(w, map[string]interface{}{
		"message":     "Delivery queued for retry",
		"delivery_id": delivery.ID,
		"queued_at":   time.Now().Unix(),
	})
}
