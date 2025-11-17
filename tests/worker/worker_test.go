package worker_test

import (
	"context"
	"testing"

	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestUpdateEndpointHealth(t *testing.T) {
	tests := []struct {
		name             string
		successful       bool
		initialStatus    types.EndpointStatus
		initialScore     int
		initialFails     int
		expectedScore    int
		expectedFails    int
		expectedStatus   types.EndpointStatus
	}{
		{
			name:           "success recovers failing endpoint",
			successful:     true,
			initialStatus:  types.EndpointStatusFailing,
			initialScore:   50,
			initialFails:   3,
			expectedScore:  55,
			expectedFails:  0,
			expectedStatus: types.EndpointStatusHealthy,
		},
		{
			name:           "failure degrades healthy endpoint",
			successful:     false,
			initialStatus:  types.EndpointStatusHealthy,
			initialScore:   50,
			initialFails:   0,
			expectedScore:  40,
			expectedFails:  1,
			expectedStatus: types.EndpointStatusDegraded,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			database := util.SetupDatabase(t)
			app := util.NewTestApplication()
			util.Must(t, database.Create(&app))

			w := &worker.Worker{DB: database.DB}

			endpoint := util.NewTestEndpoint(
				util.WithApplicationID(app.ID),
				util.WithEndpointStatus(tt.initialStatus),
			)
			util.Must(t, database.Create(&endpoint))

			health := types.EndpointHealth{
				EndpointID:       endpoint.ID,
				Status:           tt.initialStatus,
				HealthScore:      tt.initialScore,
				ConsecutiveFails: tt.initialFails,
			}
			util.Must(t, database.Create(&health))

			w.UpdateEndpointHealth(context.Background(), endpoint.ID, tt.successful)

			var updated types.EndpointHealth
			util.Must(t, database.Where("endpoint_id = ?", endpoint.ID).First(&updated))

			if updated.HealthScore != tt.expectedScore {
				t.Errorf("expected health score %d, got %d", tt.expectedScore, updated.HealthScore)
			}

			if updated.ConsecutiveFails != tt.expectedFails {
				t.Errorf("expected consecutive fails %d, got %d", tt.expectedFails, updated.ConsecutiveFails)
			}

			if updated.Status != tt.expectedStatus {
				t.Errorf("expected status %v, got %v", tt.expectedStatus, updated.Status)
			}
		})
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
