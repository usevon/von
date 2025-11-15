package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/usage"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// Worker processes webhook delivery messages from the queue.
type Worker struct {
	db           *gorm.DB
	client       *Client
	usageTracker *usage.Tracker
	consumer     *queue.Consumer
	rabbitmqURL  string
}

// NewWorker creates a new worker that processes webhook deliveries.
func NewWorker(db *gorm.DB, rabbitmqURL string, timeout time.Duration) (*Worker, error) {
	w := &Worker{
		db:           db,
		client:       NewClient(timeout),
		usageTracker: usage.NewTracker(db),
		rabbitmqURL:  rabbitmqURL,
	}

	consumer, err := queue.NewConsumer(rabbitmqURL, w.handleMessage)
	if err != nil {
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}
	w.consumer = consumer

	return w, nil
}

// Start begins processing webhook deliveries.
func (w *Worker) Start() error {
	log.Println("worker started, waiting for messages")
	select {}
}

// Stop gracefully shuts down the worker.
func (w *Worker) Stop() error {
	log.Println("worker stopping")
	return w.consumer.Close()
}

// handleMessage processes a single webhook delivery message from the queue.
func (w *Worker) handleMessage(ctx context.Context, msg types.QueueMessage) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	var delivery types.EventDelivery
	if err := w.db.WithContext(ctx).Where("id = ?", msg.DeliveryID).First(&delivery).Error; err != nil {
		log.Printf("failed to load delivery %s: %v", msg.DeliveryID, err)
		return nil
	}

	var endpoint types.Endpoint
	if err := w.db.WithContext(ctx).Where("id = ?", msg.EndpointID).First(&endpoint).Error; err != nil {
		log.Printf("failed to load endpoint %s: %v", msg.EndpointID, err)
		return nil
	}

	if endpoint.Status == types.EndpointStatusDisabled {
		log.Printf("endpoint %s is disabled, skipping delivery %s", endpoint.ID, delivery.ID)
		w.markDeliveryCancelled(ctx, &delivery)
		return nil
	}

	var event types.Event
	if err := w.db.WithContext(ctx).Where("id = ?", msg.EventID).First(&event).Error; err != nil {
		log.Printf("failed to load event %s: %v", msg.EventID, err)
		return nil
	}

	w.updateDeliveryStatus(ctx, &delivery, types.DeliveryStatusDelivering)

	result := w.client.DeliverWebhook(ctx, msg)

	attempt := types.DeliveryAttempt{
		ID:              uuid.New().String(),
		DeliveryID:      delivery.ID,
		AttemptNumber:   msg.AttemptNumber,
		RequestURL:      msg.URL,
		RequestHeaders:  convertToJSONB(msg.Headers),
		RequestBody:     mustMarshal(msg.Payload),
		StatusCode:      result.StatusCode,
		ResponseHeaders: types.JSONB(result.ResponseHeaders),
		ResponseBody:    truncate(result.ResponseBody, 10000),
		LatencyMS:       result.LatencyMS,
		StartedAt:       time.Now().Add(-time.Duration(result.LatencyMS) * time.Millisecond),
		CompletedAt:     ptrTime(time.Now()),
		Error:           result.Error,
		ErrorCode:       result.ErrorCode,
		Retryable:       result.Retryable,
		DeliveryMode:    msg.DeliveryMode,
		CreatedAt:       time.Now(),
	}

	if err := w.db.WithContext(ctx).Create(&attempt).Error; err != nil {
		log.Printf("failed to save delivery attempt: %v", err)
	}

	delivery.AttemptCount++
	delivery.LastAttemptAt = ptrTime(time.Now())
	delivery.LastStatusCode = &result.StatusCode
	delivery.LastResponsePreview = truncate(result.ResponseBody, 500)
	delivery.LastError = result.Error
	delivery.TotalLatencyMS += result.LatencyMS

	successful := result.StatusCode >= 200 && result.StatusCode < 300 && result.Error == ""

	if successful {
		delivery.Status = types.DeliveryStatusDelivered
		delivery.DeliveredAt = ptrTime(time.Now())
		w.updateEndpointHealth(ctx, &endpoint, true)
		w.usageTracker.TrackDelivery(ctx, event.OrganizationID, true)
	} else if ShouldRetry(msg.AttemptNumber, msg.MaxRetries, result.Retryable) {
		backoff := CalculateBackoff(msg.AttemptNumber+1, msg.RetryStrategy)
		delivery.NextAttemptAt = ptrTime(time.Now().Add(backoff))
		delivery.Status = types.DeliveryStatusQueued
		w.usageTracker.TrackRetry(ctx, event.OrganizationID)

		newMsg := msg
		newMsg.AttemptNumber++
		if err := w.requeueDelivery(ctx, newMsg, backoff, w.rabbitmqURL); err != nil {
			log.Printf("failed to requeue delivery: %v", err)
			return err
		}
	} else {
		delivery.Status = types.DeliveryStatusFailed
		delivery.FailedAt = ptrTime(time.Now())
		w.updateEndpointHealth(ctx, &endpoint, false)
		w.usageTracker.TrackDelivery(ctx, event.OrganizationID, false)
	}

	if err := w.db.WithContext(ctx).Save(&delivery).Error; err != nil {
		log.Printf("failed to update delivery: %v", err)
		return err
	}

	return nil
}

// requeueDelivery schedules a retry after a delay.
func (w *Worker) requeueDelivery(ctx context.Context, msg types.QueueMessage, delay time.Duration, rabbitmqURL string) error {
	publisher, err := queue.NewPublisher(rabbitmqURL)
	if err != nil {
		return err
	}
	defer publisher.Close()

	time.Sleep(delay)
	return publisher.PublishWebhook(ctx, msg)
}

// updateDeliveryStatus updates the delivery status in the database.
func (w *Worker) updateDeliveryStatus(ctx context.Context, delivery *types.EventDelivery, status types.DeliveryStatus) {
	delivery.Status = status
	if err := w.db.WithContext(ctx).Model(delivery).Update("status", status).Error; err != nil {
		log.Printf("failed to update delivery status: %v", err)
	}
}

// markDeliveryCancelled marks a delivery as cancelled.
func (w *Worker) markDeliveryCancelled(ctx context.Context, delivery *types.EventDelivery) {
	delivery.Status = types.DeliveryStatusCancelled
	delivery.CancelledAt = ptrTime(time.Now())
	if err := w.db.WithContext(ctx).Save(delivery).Error; err != nil {
		log.Printf("failed to cancel delivery: %v", err)
	}
}

// updateEndpointHealth updates the endpoint health metrics based on delivery success/failure.
func (w *Worker) updateEndpointHealth(ctx context.Context, endpoint *types.Endpoint, successful bool) {
	if successful {
		endpoint.ConsecutiveFails = 0
		endpoint.HealthScore = min(100, endpoint.HealthScore+5)
		endpoint.LastSuccessAt = ptrTime(time.Now())
		if endpoint.Status == types.EndpointStatusFailing || endpoint.Status == types.EndpointStatusDegraded {
			endpoint.Status = types.EndpointStatusHealthy
			endpoint.DisabledAt = nil
			endpoint.DisabledReason = ""
		}
	} else {
		endpoint.ConsecutiveFails++
		endpoint.HealthScore = max(0, endpoint.HealthScore-10)
		endpoint.LastFailureAt = ptrTime(time.Now())

		if endpoint.ConsecutiveFails >= 5 && endpoint.HealthScore < 20 {
			endpoint.Status = types.EndpointStatusFailing
		} else if endpoint.HealthScore < 50 {
			endpoint.Status = types.EndpointStatusDegraded
		}

		if endpoint.ConsecutiveFails >= 10 {
			endpoint.Status = types.EndpointStatusDisabled
			endpoint.DisabledAt = ptrTime(time.Now())
			endpoint.DisabledReason = "Too many consecutive failures"
		}
	}

	if err := w.db.WithContext(ctx).Save(endpoint).Error; err != nil {
		log.Printf("failed to update endpoint health: %v", err)
	}
}

// Helper functions

func ptrTime(t time.Time) *time.Time {
	return &t
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

func mustMarshal(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func convertToJSONB(m map[string]string) types.JSONB {
	result := make(types.JSONB)
	for k, v := range m {
		result[k] = v
	}
	return result
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
