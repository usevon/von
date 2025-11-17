package usage

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	rabbitmq "github.com/wagslane/go-rabbitmq"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Aggregator consumes usage events from RabbitMQ and aggregates them into the database.
type Aggregator struct {
	db       *gorm.DB
	conn     *rabbitmq.Conn
	consumer *rabbitmq.Consumer
	buffer   map[string]*types.UsageMetrics
	bufferMu sync.Mutex
	ticker   *time.Ticker
	done     chan struct{}
	wg       sync.WaitGroup
}

// NewAggregator creates a new usage aggregator.
func NewAggregator(db *gorm.DB, rabbitmqURL string) (*Aggregator, error) {
	a := &Aggregator{
		db:     db,
		buffer: make(map[string]*types.UsageMetrics),
		ticker: time.NewTicker(1 * time.Second),
		done:   make(chan struct{}),
	}

	config := queue.DefaultConfig(rabbitmqURL)

	conn, err := rabbitmq.NewConn(
		rabbitmqURL,
		rabbitmq.WithConnectionOptionsReconnectInterval(config.ReconnectInterval),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}
	a.conn = conn

	consumer, err := rabbitmq.NewConsumer(
		conn,
		queue.UsageQueue,
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsExchangeName(queue.UsageExchange),
		rabbitmq.WithConsumerOptionsExchangeKind("topic"),
		rabbitmq.WithConsumerOptionsExchangeDurable,
		rabbitmq.WithConsumerOptionsExchangeDeclare,
		rabbitmq.WithConsumerOptionsRoutingKey(queue.UsageRoutingKey),
		rabbitmq.WithConsumerOptionsConcurrency(10),
	)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}
	a.consumer = consumer

	return a, nil
}

// Start begins consuming usage events and aggregating them.
func (a *Aggregator) Start() {
	a.wg.Add(1)
	go a.flushLoop()

	// Start consuming messages
	err := a.consumer.Run(a.handleDelivery)
	if err != nil {
		log.Printf("consumer error: %v", err)
	}

	log.Println("usage aggregator started")
}

// Stop gracefully shuts down the aggregator.
func (a *Aggregator) Stop() error {
	log.Println("usage aggregator stopping")
	close(a.done)
	a.wg.Wait()
	a.ticker.Stop()
	a.flush()
	a.consumer.Close()
	a.conn.Close()
	return nil
}

// handleDelivery processes a single message delivery from RabbitMQ.
func (a *Aggregator) handleDelivery(d rabbitmq.Delivery) rabbitmq.Action {
	var event types.UsageEvent
	if err := json.Unmarshal(d.Body, &event); err != nil {
		log.Printf("failed to unmarshal usage event: %v", err)
		return rabbitmq.Ack // Ack bad data to avoid redelivery
	}

	a.bufferEvent(event)

	// Flush if buffer is large
	a.bufferMu.Lock()
	size := len(a.buffer)
	a.bufferMu.Unlock()

	if size >= 1000 {
		a.flush()
	}

	return rabbitmq.Ack
}

// flushLoop periodically flushes buffered metrics to the database.
func (a *Aggregator) flushLoop() {
	defer a.wg.Done()
	for {
		select {
		case <-a.ticker.C:
			a.flush()
		case <-a.done:
			return
		}
	}
}

// bufferEvent accumulates events in memory before flushing.
func (a *Aggregator) bufferEvent(event types.UsageEvent) {
	a.bufferMu.Lock()
	defer a.bufferMu.Unlock()

	periodStart := time.Date(event.Timestamp.Year(), event.Timestamp.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)
	key := event.OrganizationID + "_" + periodStart.Format("2006-01")

	metrics, exists := a.buffer[key]
	if !exists {
		metrics = &types.UsageMetrics{
			ID:             uuid.New().String(),
			OrganizationID: event.OrganizationID,
			PeriodStart:    periodStart,
			PeriodEnd:      periodEnd,
			CreatedAt:      event.Timestamp,
		}
		a.buffer[key] = metrics
	}

	switch event.EventType {
	case "event":
		metrics.EventsSent++
		metrics.TotalBytes += int64(event.PayloadSize)
	case "delivery":
		if event.Successful {
			metrics.EventsDelivered++
		} else {
			metrics.EventsFailed++
		}
	case "retry":
		metrics.TotalRetries++
	}
	metrics.UpdatedAt = event.Timestamp
}

// flush writes buffered metrics to database.
func (a *Aggregator) flush() {
	a.bufferMu.Lock()
	if len(a.buffer) == 0 {
		a.bufferMu.Unlock()
		return
	}
	toFlush := a.buffer
	a.buffer = make(map[string]*types.UsageMetrics)
	a.bufferMu.Unlock()

	ctx := context.Background()
	for _, metrics := range toFlush {
		if err := a.db.WithContext(ctx).Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "organization_id"}, {Name: "period_start"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"events_sent":      gorm.Expr("usage_metrics.events_sent + ?", metrics.EventsSent),
				"events_delivered": gorm.Expr("usage_metrics.events_delivered + ?", metrics.EventsDelivered),
				"events_failed":    gorm.Expr("usage_metrics.events_failed + ?", metrics.EventsFailed),
				"total_retries":    gorm.Expr("usage_metrics.total_retries + ?", metrics.TotalRetries),
				"total_bytes":      gorm.Expr("usage_metrics.total_bytes + ?", metrics.TotalBytes),
				"updated_at":       metrics.UpdatedAt,
			}),
		}).Create(metrics).Error; err != nil {
			log.Printf("failed to flush usage metrics: %v", err)
		}
	}
}
