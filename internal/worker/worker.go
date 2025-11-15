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

	now := time.Now()
	completedAt := now
	payloadBytes, _ := json.Marshal(msg.Payload)

	reqHeaders := make(types.JSONB)
	for k, v := range msg.Headers {
		reqHeaders[k] = v
	}

	responseBody := result.ResponseBody
	if len(responseBody) > 10000 {
		responseBody = responseBody[:10000]
	}

	attempt := types.DeliveryAttempt{
		ID:              uuid.New().String(),
		DeliveryID:      delivery.ID,
		AttemptNumber:   msg.AttemptNumber,
		RequestURL:      msg.URL,
		RequestHeaders:  reqHeaders,
		RequestBody:     string(payloadBytes),
		StatusCode:      result.StatusCode,
		ResponseHeaders: types.JSONB(result.ResponseHeaders),
		ResponseBody:    responseBody,
		LatencyMS:       result.LatencyMS,
		StartedAt:       now.Add(-time.Duration(result.LatencyMS) * time.Millisecond),
		CompletedAt:     &completedAt,
		Error:           result.Error,
		ErrorCode:       result.ErrorCode,
		Retryable:       result.Retryable,
		DeliveryMode:    msg.DeliveryMode,
		CreatedAt:       now,
	}

	if err := w.db.WithContext(ctx).Create(&attempt).Error; err != nil {
		log.Printf("failed to save delivery attempt: %v", err)
	}

	lastAttemptAt := time.Now()
	preview := result.ResponseBody
	if len(preview) > 500 {
		preview = preview[:500]
	}

	delivery.AttemptCount++
	delivery.LastAttemptAt = &lastAttemptAt
	delivery.LastStatusCode = &result.StatusCode
	delivery.LastResponsePreview = preview
	delivery.LastError = result.Error
	delivery.TotalLatencyMS += result.LatencyMS

	successful := result.StatusCode >= 200 && result.StatusCode < 300 && result.Error == ""

	if successful {
		deliveredAt := time.Now()
		delivery.Status = types.DeliveryStatusDelivered
		delivery.DeliveredAt = &deliveredAt
		w.updateEndpointHealth(ctx, &endpoint, true)
		w.usageTracker.TrackDelivery(ctx, event.OrganizationID, true)
	} else if ShouldRetry(msg.AttemptNumber, msg.MaxRetries, result.Retryable) {
		backoff := CalculateBackoff(msg.AttemptNumber+1, msg.RetryStrategy)
		nextAttempt := time.Now().Add(backoff)
		delivery.NextAttemptAt = &nextAttempt
		delivery.Status = types.DeliveryStatusQueued
		w.usageTracker.TrackRetry(ctx, event.OrganizationID)

		newMsg := msg
		newMsg.AttemptNumber++
		if err := w.requeueDelivery(ctx, newMsg, backoff, w.rabbitmqURL); err != nil {
			log.Printf("failed to requeue delivery: %v", err)
			return err
		}
	} else {
		failedAt := time.Now()
		delivery.Status = types.DeliveryStatusFailed
		delivery.FailedAt = &failedAt
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
	cancelledAt := time.Now()
	delivery.Status = types.DeliveryStatusCancelled
	delivery.CancelledAt = &cancelledAt
	if err := w.db.WithContext(ctx).Save(delivery).Error; err != nil {
		log.Printf("failed to cancel delivery: %v", err)
	}
}

// updateEndpointHealth updates the endpoint health metrics based on delivery success/failure.
func (w *Worker) updateEndpointHealth(ctx context.Context, endpoint *types.Endpoint, successful bool) {
	now := time.Now()

	if successful {
		endpoint.ConsecutiveFails = 0
		if endpoint.HealthScore+5 > 100 {
			endpoint.HealthScore = 100
		} else {
			endpoint.HealthScore += 5
		}
		endpoint.LastSuccessAt = &now
		if endpoint.Status == types.EndpointStatusFailing || endpoint.Status == types.EndpointStatusDegraded {
			endpoint.Status = types.EndpointStatusHealthy
			endpoint.DisabledAt = nil
			endpoint.DisabledReason = ""
		}
	} else {
		endpoint.ConsecutiveFails++
		if endpoint.HealthScore-10 < 0 {
			endpoint.HealthScore = 0
		} else {
			endpoint.HealthScore -= 10
		}
		endpoint.LastFailureAt = &now

		if endpoint.ConsecutiveFails >= 5 && endpoint.HealthScore < 20 {
			endpoint.Status = types.EndpointStatusFailing
		} else if endpoint.HealthScore < 50 {
			endpoint.Status = types.EndpointStatusDegraded
		}

		if endpoint.ConsecutiveFails >= 10 {
			endpoint.Status = types.EndpointStatusDisabled
			endpoint.DisabledAt = &now
			endpoint.DisabledReason = "Too many consecutive failures"
		}
	}

	if err := w.db.WithContext(ctx).Save(endpoint).Error; err != nil {
		log.Printf("failed to update endpoint health: %v", err)
	}
}

