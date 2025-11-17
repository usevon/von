package worker_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
)

func setupTestDB(t *testing.T) *db.DB {
	database, err := db.New("postgresql://von:von_dev_password@localhost:5432/von_dev?sslmode=disable")
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	database.DB.Exec("DELETE FROM event_delivery")
	database.DB.Exec("DELETE FROM endpoint_health")
	database.DB.Exec("DELETE FROM endpoint")

	return database
}

func createTestApp(t *testing.T, database *db.DB) *types.Application {
	app := &types.Application{
		ID:             uuid.New().String(),
		OrganizationID: uuid.New().String(),
		Name:           "Test App",
		UID:            "test-app-" + uuid.New().String(),
	}
	if err := database.Create(app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}
	return app
}

func TestUpdateEndpointHealth_Success(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusFailing,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:       endpointID,
		HealthScore:      50,
		ConsecutiveFails: 3,
		Status:           types.EndpointStatusFailing,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, true)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 55 {
		t.Errorf("expected health score 55, got %d", updated.HealthScore)
	}

	if updated.ConsecutiveFails != 0 {
		t.Errorf("expected consecutive fails to be reset to 0, got %d", updated.ConsecutiveFails)
	}

	if updated.Status != types.EndpointStatusHealthy {
		t.Errorf("expected status to recover to healthy, got %v", updated.Status)
	}

	if updated.LastSuccessAt == nil {
		t.Error("expected LastSuccessAt to be set")
	}
}

func TestUpdateEndpointHealth_Failure(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusHealthy,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:       endpointID,
		HealthScore:      50,
		ConsecutiveFails: 0,
		Status:           types.EndpointStatusHealthy,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 40 {
		t.Errorf("expected health score 40, got %d", updated.HealthScore)
	}

	if updated.ConsecutiveFails != 1 {
		t.Errorf("expected consecutive fails 1, got %d", updated.ConsecutiveFails)
	}

	if updated.Status != types.EndpointStatusDegraded {
		t.Errorf("expected status degraded, got %v", updated.Status)
	}

	if updated.LastFailureAt == nil {
		t.Error("expected LastFailureAt to be set")
	}
}

func TestUpdateEndpointHealth_HealthScoreMax(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusHealthy,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:  endpointID,
		HealthScore: 97,
		Status:      types.EndpointStatusHealthy,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, true)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 100 {
		t.Errorf("expected health score capped at 100, got %d", updated.HealthScore)
	}
}

func TestUpdateEndpointHealth_HealthScoreMin(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusHealthy,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:  endpointID,
		HealthScore: 5,
		Status:      types.EndpointStatusHealthy,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 0 {
		t.Errorf("expected health score floored at 0, got %d", updated.HealthScore)
	}
}

func TestUpdateEndpointHealth_StatusTransitionToFailing(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusDegraded,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:       endpointID,
		HealthScore:      25,
		ConsecutiveFails: 4,
		Status:           types.EndpointStatusDegraded,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.ConsecutiveFails != 5 {
		t.Errorf("expected consecutive fails 5, got %d", updated.ConsecutiveFails)
	}

	if updated.HealthScore != 15 {
		t.Errorf("expected health score 15, got %d", updated.HealthScore)
	}

	if updated.Status != types.EndpointStatusFailing {
		t.Errorf("expected status failing (5+ fails and health < 20), got %v", updated.Status)
	}
}

func TestUpdateEndpointHealth_StatusTransitionToDegraded(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusHealthy,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:  endpointID,
		HealthScore: 55,
		Status:      types.EndpointStatusHealthy,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 45 {
		t.Errorf("expected health score 45, got %d", updated.HealthScore)
	}

	if updated.Status != types.EndpointStatusDegraded {
		t.Errorf("expected status degraded (health < 50), got %v", updated.Status)
	}
}

func TestUpdateEndpointHealth_AutoDisableAfter10Failures(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusFailing,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := types.EndpointHealth{
		EndpointID:       endpointID,
		HealthScore:      10,
		ConsecutiveFails: 9,
		Status:           types.EndpointStatusFailing,
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.ConsecutiveFails != 10 {
		t.Errorf("expected consecutive fails 10, got %d", updated.ConsecutiveFails)
	}

	if updated.Status != types.EndpointStatusDisabled {
		t.Errorf("expected status disabled (10+ failures), got %v", updated.Status)
	}

	if updated.DisabledAt == nil {
		t.Error("expected DisabledAt to be set")
	}

	if updated.DisabledReason != "Too many consecutive failures" {
		t.Errorf("expected disabled reason to be set, got %s", updated.DisabledReason)
	}
}

func TestUpdateEndpointHealth_RecoveryFromFailing(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpointID := uuid.New().String()
	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: app.ID,
		UID:           "test-endpoint-" + uuid.New().String(),
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusFailing,
	}

	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	disabledAt := time.Now()
	health := types.EndpointHealth{
		EndpointID:       endpointID,
		HealthScore:      10,
		ConsecutiveFails: 7,
		Status:           types.EndpointStatusFailing,
		DisabledAt:       &disabledAt,
		DisabledReason:   "Too many failures",
	}

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpointID, true)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpointID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.ConsecutiveFails != 0 {
		t.Errorf("expected consecutive fails reset to 0, got %d", updated.ConsecutiveFails)
	}

	if updated.HealthScore != 15 {
		t.Errorf("expected health score 15, got %d", updated.HealthScore)
	}

	if updated.Status != types.EndpointStatusHealthy {
		t.Errorf("expected status to recover to healthy, got %v", updated.Status)
	}

	if updated.DisabledAt != nil {
		t.Error("expected DisabledAt to be cleared")
	}

	if updated.DisabledReason != "" {
		t.Error("expected DisabledReason to be cleared")
	}
}

func TestMarkDeliveryCancelled(t *testing.T) {
	database := setupTestDB(t)
	app := createTestApp(t, database)

	w := &worker.Worker{DB: database.DB}

	endpoint := types.Endpoint{
		ID:            uuid.New().String(),
		ApplicationID: app.ID,
		URL:           "https://example.com/webhook",
		Status:        types.EndpointStatusHealthy,
	}
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	event := types.Event{
		ID:             uuid.New().String(),
		ApplicationID:  app.ID,
		OrganizationID: app.OrganizationID,
		EventType:      "test.event",
		Payload:        types.JSONB{"test": "data"},
	}
	if err := database.Create(&event).Error; err != nil {
		t.Fatalf("failed to create event: %v", err)
	}

	delivery := types.EventDelivery{
		ID:         uuid.New().String(),
		EventID:    event.ID,
		EndpointID: endpoint.ID,
		Status:     types.DeliveryStatusQueued,
	}

	if err := database.Create(&delivery).Error; err != nil {
		t.Fatalf("failed to create delivery: %v", err)
	}

	w.MarkDeliveryCancelled(context.Background(), &delivery)

	if delivery.Status != types.DeliveryStatusCancelled {
		t.Errorf("expected status cancelled, got %v", delivery.Status)
	}

	if delivery.CancelledAt == nil {
		t.Error("expected CancelledAt to be set")
	}

	var updated types.EventDelivery
	if err := database.Where("id = ?", delivery.ID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load delivery: %v", err)
	}

	if updated.Status != types.DeliveryStatusCancelled {
		t.Errorf("expected status persisted as cancelled, got %v", updated.Status)
	}
}
