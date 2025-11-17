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
	"github.com/usevon/von/internal/util"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// Worker processes webhook delivery messages from the queue.
type Worker struct {
	DB             *gorm.DB
	client         *Client
	usageTracker   *usage.Tracker
	consumer       *queue.Consumer
	publisher      *queue.Publisher
	circuitBreaker *CircuitBreaker
	rabbitmqURL    string
}

// NewWorker creates a new worker that processes webhook deliveries.
func NewWorker(db *gorm.DB, rabbitmqURL string, timeout time.Duration) (*Worker, error) {
	w := &Worker{
		DB:             db,
		client:         NewClient(timeout),
		usageTracker:   usage.NewTracker(db),
		circuitBreaker: NewCircuitBreaker(),
		rabbitmqURL:    rabbitmqURL,
	}

	// Create publisher for requeuing messages (reuse connection)
	publisher, err := queue.NewPublisher(rabbitmqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create publisher: %w", err)
	}
	w.publisher = publisher

	consumer, err := queue.NewConsumer(rabbitmqURL, w.HandleMessage)
	if err != nil {
		publisher.Close()
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
	w.consumer.Close()
	w.publisher.Close()
	return nil
}

// HandleMessage processes a single webhook delivery message from the queue.
func (w *Worker) HandleMessage(ctx context.Context, msg types.QueueMessage) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	var delivery types.EventDelivery
	if err := w.DB.WithContext(ctx).Where("id = ?", msg.DeliveryID).First(&delivery).Error; err != nil {
		log.Printf("failed to load delivery %s: %v", msg.DeliveryID, err)
		return nil
	}

	var endpoint types.Endpoint
	if err := w.DB.WithContext(ctx).Where("id = ?", msg.EndpointID).First(&endpoint).Error; err != nil {
		log.Printf("failed to load endpoint %s: %v", msg.EndpointID, err)
		return nil
	}

	if endpoint.Status == types.EndpointStatusDisabled {
		log.Printf("endpoint %s is disabled, skipping delivery %s", endpoint.ID, delivery.ID)
		w.MarkDeliveryCancelled(ctx, &delivery)
		return nil
	}

	if w.circuitBreaker.IsOpen(msg.EndpointID) {
		log.Printf("circuit breaker open for endpoint %s, skipping delivery %s", endpoint.ID, delivery.ID)
		backoff := CalculateBackoff(msg.AttemptNumber+1, msg.RetryStrategy)
		nextAttempt := time.Now().Add(backoff)
		delivery.NextAttemptAt = &nextAttempt
		delivery.Status = types.DeliveryStatusQueued
		if err := w.DB.WithContext(ctx).Save(&delivery).Error; err != nil {
			log.Printf("failed to update delivery: %v", err)
		}
		newMsg := msg
		newMsg.AttemptNumber++
		if err := w.requeueDelivery(ctx, newMsg, backoff, w.rabbitmqURL); err != nil {
			log.Printf("failed to requeue delivery: %v", err)
			return err
		}
		return nil
	}

	var event types.Event
	if err := w.DB.WithContext(ctx).Where("id = ?", msg.EventID).First(&event).Error; err != nil {
		log.Printf("failed to load event %s: %v", msg.EventID, err)
		return nil
	}

	result := w.client.DeliverWebhook(ctx, msg)

	now := time.Now()
	payloadBytes, _ := json.Marshal(msg.Payload)

	attempt := types.DeliveryAttempt{
		ID:              uuid.New().String(),
		DeliveryID:      delivery.ID,
		AttemptNumber:   msg.AttemptNumber,
		RequestURL:      msg.URL,
		RequestHeaders:  util.HeadersToJSONB(msg.Headers),
		RequestBody:     string(payloadBytes),
		StatusCode:      result.StatusCode,
		ResponseHeaders: util.HeadersToJSONB(result.ResponseHeaders),
		ResponseBody:    util.Truncate(result.ResponseBody, 10000),
		LatencyMS:       result.LatencyMS,
		StartedAt:       now.Add(-time.Duration(result.LatencyMS) * time.Millisecond),
		CompletedAt:     util.TimePtr(now),
		Error:           result.Error,
		ErrorCode:       result.ErrorCode,
		Retryable:       result.Retryable,
		DeliveryMode:    msg.DeliveryMode,
		CreatedAt:       now,
	}

	if err := w.DB.WithContext(ctx).Create(&attempt).Error; err != nil {
		log.Printf("failed to save delivery attempt: %v", err)
	}

	delivery.AttemptCount++
	delivery.LastAttemptAt = util.TimePtr(time.Now())
	delivery.LastStatusCode = util.IntPtr(result.StatusCode)
	delivery.LastResponsePreview = util.Truncate(result.ResponseBody, 500)
	delivery.LastError = result.Error
	delivery.TotalLatencyMS += result.LatencyMS

	if result.IsSuccessful() {
		delivery.Status = types.DeliveryStatusDelivered
		delivery.DeliveredAt = util.TimePtr(time.Now())
		w.UpdateEndpointHealth(ctx, &endpoint, true)
		w.circuitBreaker.RecordSuccess(msg.EndpointID)
		w.usageTracker.TrackDelivery(ctx, event.OrganizationID, true)
	} else if ShouldRetry(msg.AttemptNumber, msg.MaxRetries, result.Retryable) {
		backoff := CalculateBackoff(msg.AttemptNumber+1, msg.RetryStrategy)
		nextAttempt := time.Now().Add(backoff)
		delivery.NextAttemptAt = &nextAttempt
		delivery.Status = types.DeliveryStatusQueued
		w.circuitBreaker.RecordFailure(msg.EndpointID)
		w.usageTracker.TrackRetry(ctx, event.OrganizationID)

		newMsg := msg
		newMsg.AttemptNumber++
		if err := w.requeueDelivery(ctx, newMsg, backoff, w.rabbitmqURL); err != nil {
			log.Printf("failed to requeue delivery: %v", err)
			return err
		}
	} else {
		delivery.Status = types.DeliveryStatusFailed
		delivery.FailedAt = util.TimePtr(time.Now())
		w.UpdateEndpointHealth(ctx, &endpoint, false)
		w.circuitBreaker.RecordFailure(msg.EndpointID)
		w.usageTracker.TrackDelivery(ctx, event.OrganizationID, false)
	}

	if err := w.DB.WithContext(ctx).Save(&delivery).Error; err != nil {
		log.Printf("failed to update delivery: %v", err)
		return err
	}

	return nil
}

// requeueDelivery schedules a retry after a delay.
func (w *Worker) requeueDelivery(ctx context.Context, msg types.QueueMessage, delay time.Duration, rabbitmqURL string) error {
	time.Sleep(delay)
	return w.publisher.PublishWebhook(ctx, msg)
}

// UpdateDeliveryStatus updates the delivery status in the database.
func (w *Worker) UpdateDeliveryStatus(ctx context.Context, delivery *types.EventDelivery, status types.DeliveryStatus) {
	delivery.Status = status
	if err := w.DB.WithContext(ctx).Model(delivery).Update("status", status).Error; err != nil {
		log.Printf("failed to update delivery status: %v", err)
	}
}

// MarkDeliveryCancelled marks a delivery as cancelled.
func (w *Worker) MarkDeliveryCancelled(ctx context.Context, delivery *types.EventDelivery) {
	delivery.Status = types.DeliveryStatusCancelled
	delivery.CancelledAt = util.TimePtr(time.Now())
	if err := w.DB.WithContext(ctx).Save(delivery).Error; err != nil {
		log.Printf("failed to cancel delivery: %v", err)
	}
}

// UpdateEndpointHealth updates the endpoint health metrics based on delivery success/failure.
func (w *Worker) UpdateEndpointHealth(ctx context.Context, endpoint *types.Endpoint, successful bool) {
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

	if err := w.DB.WithContext(ctx).Save(endpoint).Error; err != nil {
		log.Printf("failed to update endpoint health: %v", err)
	}
}

