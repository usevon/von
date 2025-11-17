package worker_test

import (
	"context"
	"testing"

	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestUpdateEndpointHealth_Success(t *testing.T) {
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	util.Must(t, database.Create(&app))

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusFailing),
	)
	util.Must(t, database.Create(&endpoint))

	health := types.EndpointHealth{
		EndpointID:       endpoint.ID,
		Status:           types.EndpointStatusFailing,
		HealthScore:      50,
		ConsecutiveFails: 3,
	}
	util.Must(t, database.Create(&health))

	w.UpdateEndpointHealth(context.Background(), endpoint.ID, true)

	var updated types.EndpointHealth
	util.Must(t, database.Where("endpoint_id = ?", endpoint.ID).First(&updated))

	if updated.HealthScore != 55 {
		t.Errorf("expected health score 55, got %d", updated.HealthScore)
	}

	if updated.ConsecutiveFails != 0 {
		t.Errorf("expected consecutive fails reset to 0, got %d", updated.ConsecutiveFails)
	}

	if updated.Status != types.EndpointStatusHealthy {
		t.Errorf("expected status healthy, got %v", updated.Status)
	}
}

func TestUpdateEndpointHealth_Failure(t *testing.T) {
	database := util.SetupDatabase(t)
	app := util.NewTestApplication()
	util.Must(t, database.Create(&app))

	w := &worker.Worker{DB: database.DB}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithEndpointStatus(types.EndpointStatusHealthy),
	)
	util.Must(t, database.Create(&endpoint))

	health := types.EndpointHealth{
		EndpointID:       endpoint.ID,
		Status:           types.EndpointStatusHealthy,
		HealthScore:      50,
		ConsecutiveFails: 0,
	}
	util.Must(t, database.Create(&health))

	w.UpdateEndpointHealth(context.Background(), endpoint.ID, false)

	var updated types.EndpointHealth
	util.Must(t, database.Where("endpoint_id = ?", endpoint.ID).First(&updated))

	if updated.HealthScore != 40 {
		t.Errorf("expected health score 40, got %d", updated.HealthScore)
	}

	if updated.ConsecutiveFails != 1 {
		t.Errorf("expected consecutive fails 1, got %d", updated.ConsecutiveFails)
	}

	if updated.Status != types.EndpointStatusDegraded {
		t.Errorf("expected status degraded, got %v", updated.Status)
	}
}

func TestMarkDeliveryCancelled(t *testing.T) {
	database := util.SetupDatabase(t)
	w := &worker.Worker{DB: database.DB}

	app := util.NewTestApplication()
	util.Must(t, database.Create(&app))

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
	)
	util.Must(t, database.Create(&endpoint))

	event := util.NewTestEvent(
		util.WithEventApplicationID(app.ID),
		util.WithEventOrganizationID(app.OrganizationID),
	)
	util.Must(t, database.Create(&event))

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusQueued),
	)
	util.Must(t, database.Create(&delivery))

	w.MarkDeliveryCancelled(context.Background(), &delivery)

	var updated types.EventDelivery
	util.Must(t, database.Where("id = ?", delivery.ID).First(&updated))

	if updated.Status != types.DeliveryStatusCancelled {
		t.Errorf("expected status cancelled, got %v", updated.Status)
	}

	if updated.CancelledAt == nil {
		t.Error("expected CancelledAt to be set")
	}
}
