package usage_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/usage"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
	"gorm.io/gorm"
)

var testRabbitMQURL = util.GetRabbitMQURL()

func TestTrackerPublishEvent(t *testing.T) {
	db := util.SetupDatabase(t)
	defer db.Close()

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	tracker := usage.NewTracker(db.DB, publisher)

	ctx := context.Background()
	err = tracker.TrackEvent(ctx, "org-123", 1024)
	if err != nil {
		t.Fatalf("failed to track event: %v", err)
	}

	err = tracker.TrackDelivery(ctx, "org-123", true)
	if err != nil {
		t.Fatalf("failed to track delivery: %v", err)
	}

	err = tracker.TrackRetry(ctx, "org-123")
	if err != nil {
		t.Fatalf("failed to track retry: %v", err)
	}
}

func TestAggregatorConsumesEvents(t *testing.T) {
	db := util.SetupDatabase(t)
	defer db.Close()

	if err := queue.EnsureQueues(testRabbitMQURL); err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	tracker := usage.NewTracker(db.DB, publisher)

	aggregator, err := usage.NewAggregator(db.DB, testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create aggregator: %v", err)
	}
	defer aggregator.Stop()

	go aggregator.Start()

	time.Sleep(2 * time.Second)

	ctx := context.Background()
	orgID := uuid.New().String()

	err = tracker.TrackEvent(ctx, orgID, 512)
	if err != nil {
		t.Fatalf("failed to track event: %v", err)
	}

	err = tracker.TrackDelivery(ctx, orgID, true)
	if err != nil {
		t.Fatalf("failed to track delivery: %v", err)
	}

	err = tracker.TrackDelivery(ctx, orgID, false)
	if err != nil {
		t.Fatalf("failed to track failed delivery: %v", err)
	}

	err = tracker.TrackRetry(ctx, orgID)
	if err != nil {
		t.Fatalf("failed to track retry: %v", err)
	}

	time.Sleep(3 * time.Second)

	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	var metrics types.UsageMetrics
	err = db.DB.Where("organization_id = ? AND period_start = ?", orgID, periodStart).First(&metrics).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			t.Fatalf("no metrics found for organization %s in period %s", orgID, periodStart.Format("2006-01"))
		}
		t.Fatalf("failed to query metrics: %v", err)
	}

	if metrics.EventsSent != 1 {
		t.Errorf("expected EventsSent = 1, got %d", metrics.EventsSent)
	}
	if metrics.TotalBytes != 512 {
		t.Errorf("expected TotalBytes = 512, got %d", metrics.TotalBytes)
	}
	if metrics.EventsDelivered != 1 {
		t.Errorf("expected EventsDelivered = 1, got %d", metrics.EventsDelivered)
	}
	if metrics.EventsFailed != 1 {
		t.Errorf("expected EventsFailed = 1, got %d", metrics.EventsFailed)
	}
	if metrics.TotalRetries != 1 {
		t.Errorf("expected TotalRetries = 1, got %d", metrics.TotalRetries)
	}
}

func TestAggregatorBatchUpsert(t *testing.T) {
	db := util.SetupDatabase(t)
	defer db.Close()

	if err := queue.EnsureQueues(testRabbitMQURL); err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	tracker := usage.NewTracker(db.DB, publisher)

	aggregator, err := usage.NewAggregator(db.DB, testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create aggregator: %v", err)
	}
	defer aggregator.Stop()

	go aggregator.Start()

	time.Sleep(2 * time.Second)

	ctx := context.Background()
	orgID := uuid.New().String()

	for i := 0; i < 10; i++ {
		err = tracker.TrackEvent(ctx, orgID, 100)
		if err != nil {
			t.Fatalf("failed to track event %d: %v", i, err)
		}
	}

	for i := 0; i < 5; i++ {
		err = tracker.TrackDelivery(ctx, orgID, true)
		if err != nil {
			t.Fatalf("failed to track delivery %d: %v", i, err)
		}
	}

	time.Sleep(3 * time.Second)

	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	var metrics types.UsageMetrics
	err = db.DB.Where("organization_id = ? AND period_start = ?", orgID, periodStart).First(&metrics).Error
	if err != nil {
		t.Fatalf("failed to query metrics: %v", err)
	}

	if metrics.EventsSent != 10 {
		t.Errorf("expected EventsSent = 10, got %d", metrics.EventsSent)
	}
	if metrics.TotalBytes != 1000 {
		t.Errorf("expected TotalBytes = 1000, got %d", metrics.TotalBytes)
	}
	if metrics.EventsDelivered != 5 {
		t.Errorf("expected EventsDelivered = 5, got %d", metrics.EventsDelivered)
	}
}

func TestTrackerGetUsage(t *testing.T) {
	db := util.SetupDatabase(t)
	defer db.Close()

	if err := queue.EnsureQueues(testRabbitMQURL); err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	tracker := usage.NewTracker(db.DB, publisher)

	aggregator, err := usage.NewAggregator(db.DB, testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create aggregator: %v", err)
	}
	defer aggregator.Stop()

	go aggregator.Start()

	time.Sleep(2 * time.Second)

	ctx := context.Background()
	orgID := uuid.New().String()

	err = tracker.TrackEvent(ctx, orgID, 2048)
	if err != nil {
		t.Fatalf("failed to track event: %v", err)
	}

	time.Sleep(3 * time.Second)

	metrics, err := tracker.GetCurrentMonthUsage(ctx, orgID)
	if err != nil {
		t.Fatalf("failed to get current month usage: %v", err)
	}

	if metrics == nil {
		t.Fatal("expected metrics, got nil")
	}

	if metrics.EventsSent != 1 {
		t.Errorf("expected EventsSent = 1, got %d", metrics.EventsSent)
	}
	if metrics.TotalBytes != 2048 {
		t.Errorf("expected TotalBytes = 2048, got %d", metrics.TotalBytes)
	}
}

func TestMultipleOrganizations(t *testing.T) {
	db := util.SetupDatabase(t)
	defer db.Close()

	if err := queue.EnsureQueues(testRabbitMQURL); err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	tracker := usage.NewTracker(db.DB, publisher)

	aggregator, err := usage.NewAggregator(db.DB, testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create aggregator: %v", err)
	}
	defer aggregator.Stop()

	go aggregator.Start()

	time.Sleep(2 * time.Second)

	ctx := context.Background()
	orgID1 := uuid.New().String()
	orgID2 := uuid.New().String()

	err = tracker.TrackEvent(ctx, orgID1, 100)
	if err != nil {
		t.Fatalf("failed to track event for org1: %v", err)
	}

	err = tracker.TrackEvent(ctx, orgID2, 200)
	if err != nil {
		t.Fatalf("failed to track event for org2: %v", err)
	}

	time.Sleep(3 * time.Second)

	metrics1, err := tracker.GetCurrentMonthUsage(ctx, orgID1)
	if err != nil {
		t.Fatalf("failed to get usage for org1: %v", err)
	}

	metrics2, err := tracker.GetCurrentMonthUsage(ctx, orgID2)
	if err != nil {
		t.Fatalf("failed to get usage for org2: %v", err)
	}

	if metrics1 == nil || metrics2 == nil {
		t.Fatal("expected metrics for both orgs")
	}

	if metrics1.TotalBytes != 100 {
		t.Errorf("org1: expected TotalBytes = 100, got %d", metrics1.TotalBytes)
	}

	if metrics2.TotalBytes != 200 {
		t.Errorf("org2: expected TotalBytes = 200, got %d", metrics2.TotalBytes)
	}
}
