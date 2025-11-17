package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/repository"
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
	endpointRepo   repository.EndpointRepository
	rabbitmqURL    string
}

// NewWorker creates a new worker that processes webhook deliveries.
func NewWorker(db *gorm.DB, rabbitmqURL string, timeout time.Duration) (*Worker, error) {
	baseRepo := repository.NewEndpointRepo(db)
	cachedRepo := repository.NewCachedEndpointRepo(baseRepo, 5*time.Minute, 1000)

	// Create publisher for requeuing messages and usage tracking
	publisher, err := queue.NewPublisher(rabbitmqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create publisher: %w", err)
	}

	w := &Worker{
		DB:             db,
		client:         NewClient(timeout),
		usageTracker:   usage.NewTracker(db, publisher),
		circuitBreaker: NewCircuitBreaker(),
		endpointRepo:   cachedRepo,
		rabbitmqURL:    rabbitmqURL,
		publisher:      publisher,
	}

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

	// Load delivery with only needed fields
	var delivery types.EventDelivery
	if err := w.DB.WithContext(ctx).
		Select("id", "event_id", "endpoint_id", "status", "attempt_count", "max_attempts", "next_attempt_at", "last_status_code", "last_response_preview", "last_error", "total_latency_ms", "delivered_at", "failed_at", "cancelled_at").
		Where("id = ?", msg.DeliveryID).
		First(&delivery).Error; err != nil {
		log.Printf("failed to load delivery %s: %v", msg.DeliveryID, err)
		return nil
	}

	// Get endpoint from repository
	endpoint, err := w.endpointRepo.GetByID(ctx, msg.EndpointID)
	if err != nil {
		log.Printf("failed to load endpoint %s: %v", msg.EndpointID, err)
		return nil
	}

	if endpoint.Status == types.EndpointStatusDisabled {
		log.Printf("endpoint %s is disabled, skipping delivery %s", msg.EndpointID, delivery.ID)
		w.MarkDeliveryCancelled(ctx, &delivery)
		return nil
	}

	if w.circuitBreaker.IsOpen(msg.EndpointID) {
		log.Printf("circuit breaker open for endpoint %s, skipping delivery %s", msg.EndpointID, delivery.ID)
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
		w.UpdateEndpointHealth(ctx, msg.EndpointID, true)
		w.circuitBreaker.RecordSuccess(msg.EndpointID)
		if err := w.usageTracker.TrackDelivery(ctx, msg.OrganizationID, true); err != nil {
			log.Printf("failed to track delivery: %v", err)
		}
	} else if ShouldRetry(msg.AttemptNumber, msg.MaxRetries, result.Retryable) {
		backoff := CalculateBackoff(msg.AttemptNumber+1, msg.RetryStrategy)
		nextAttempt := time.Now().Add(backoff)
		delivery.NextAttemptAt = &nextAttempt
		delivery.Status = types.DeliveryStatusQueued
		w.circuitBreaker.RecordFailure(msg.EndpointID)
		if err := w.usageTracker.TrackRetry(ctx, msg.OrganizationID); err != nil {
			log.Printf("failed to track retry: %v", err)
		}

		newMsg := msg
		newMsg.AttemptNumber++
		if err := w.requeueDelivery(ctx, newMsg, backoff, w.rabbitmqURL); err != nil {
			log.Printf("failed to requeue delivery: %v", err)
			return err
		}
	} else {
		delivery.Status = types.DeliveryStatusFailed
		delivery.FailedAt = util.TimePtr(time.Now())
		w.UpdateEndpointHealth(ctx, msg.EndpointID, false)
		w.circuitBreaker.RecordFailure(msg.EndpointID)
		if err := w.usageTracker.TrackDelivery(ctx, msg.OrganizationID, false); err != nil {
			log.Printf("failed to track delivery: %v", err)
		}
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
	return w.publisher.PublishWebhook(ctx, &msg)
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
// Returns true if the endpoint status changed, false otherwise.
func (w *Worker) UpdateEndpointHealth(ctx context.Context, endpointID string, successful bool) bool {
	var health types.EndpointHealth
	if err := w.DB.WithContext(ctx).Where("endpoint_id = ?", endpointID).First(&health).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			health = types.EndpointHealth{
				EndpointID:  endpointID,
				Status:      types.EndpointStatusHealthy,
				HealthScore: 100,
			}
		} else {
			log.Printf("failed to load endpoint health: %v", err)
			return false
		}
	}

	now := time.Now()
	oldStatus := health.Status

	if successful {
		health.ConsecutiveFails = 0
		if health.HealthScore+5 > 100 {
			health.HealthScore = 100
		} else {
			health.HealthScore += 5
		}
		health.LastSuccessAt = &now
		if health.Status == types.EndpointStatusFailing || health.Status == types.EndpointStatusDegraded {
			health.Status = types.EndpointStatusHealthy
			health.DisabledAt = nil
			health.DisabledReason = ""
		}
	} else {
		health.ConsecutiveFails++
		if health.HealthScore-10 < 0 {
			health.HealthScore = 0
		} else {
			health.HealthScore -= 10
		}
		health.LastFailureAt = &now

		if health.ConsecutiveFails >= 5 && health.HealthScore < 20 {
			health.Status = types.EndpointStatusFailing
		} else if health.HealthScore < 50 {
			health.Status = types.EndpointStatusDegraded
		}

		if health.ConsecutiveFails >= 10 {
			health.Status = types.EndpointStatusDisabled
			health.DisabledAt = &now
			health.DisabledReason = "Too many consecutive failures"
		}
	}

	health.UpdatedAt = now
	if err := w.DB.WithContext(ctx).Save(&health).Error; err != nil {
		log.Printf("failed to update endpoint health: %v", err)
		return false
	}

	return oldStatus != health.Status
}

