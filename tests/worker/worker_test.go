package worker_test

import (
	"context"
	"testing"
	"time"

	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestUpdateEndpointHealth_Success(t *testing.T) {
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusFailing),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(50),
		util.WithConsecutiveFails(3),
		util.WithHealthStatus(types.EndpointStatusFailing),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, true)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
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
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(50),
		util.WithConsecutiveFails(0),
		util.WithHealthStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
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
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(97),
		util.WithHealthStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, true)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 100 {
		t.Errorf("expected health score capped at 100, got %d", updated.HealthScore)
	}
}

func TestUpdateEndpointHealth_HealthScoreMin(t *testing.T) {
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(5),
		util.WithHealthStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
		t.Fatalf("failed to load health: %v", err)
	}

	if updated.HealthScore != 0 {
		t.Errorf("expected health score floored at 0, got %d", updated.HealthScore)
	}
}

func TestUpdateEndpointHealth_StatusTransitionToFailing(t *testing.T) {
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusDegraded),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(25),
		util.WithConsecutiveFails(4),
		util.WithHealthStatus(types.EndpointStatusDegraded),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
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
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(55),
		util.WithHealthStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
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
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusFailing),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(10),
		util.WithConsecutiveFails(9),
		util.WithHealthStatus(types.EndpointStatusFailing),
	)
	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, false)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
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
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusFailing),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	disabledAt := time.Now()
	health := util.NewTestEndpointHealth(
		util.WithHealthEndpointID(endpoint.ID),
		util.WithEndpointHealthScore(10),
		util.WithConsecutiveFails(7),
		util.WithHealthStatus(types.EndpointStatusFailing),
	)
	health.DisabledAt = &disabledAt
	health.DisabledReason = "Too many failures"

	if err := database.Create(&health).Error; err != nil {
		t.Fatalf("failed to create endpoint health: %v", err)
	}

	statusChanged := w.UpdateEndpointHealth(context.Background(), endpoint.ID, true)
	_ = statusChanged

	var updated types.EndpointHealth
	if err := database.Where("endpoint_id = ?", endpoint.ID).First(&updated).Error; err != nil {
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
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusHealthy),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(app.ID),
		util.WithEventOrganizationID(app.OrganizationID),
	)
	if err := database.Create(&event).Error; err != nil {
		t.Fatalf("failed to create event: %v", err)
	}

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusQueued),
	)
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
