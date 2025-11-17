package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/api"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

var testPostgresURL = util.GetPostgresURL()

type mockPublisher struct {
	messages []types.QueueMessage
}

func (m *mockPublisher) PublishWebhook(ctx context.Context, msg types.QueueMessage) error {
	m.messages = append(m.messages, msg)
	return nil
}

func (m *mockPublisher) Close() {}

func (m *mockPublisher) reset() {
	m.messages = nil
}

type testServer struct {
	server    *api.Server
	db        *db.DB
	publisher *mockPublisher
	orgID     string
	appID     string
}

func setupTestServer(t *testing.T) *testServer {
	database, err := db.New(testPostgresURL)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	publisher := &mockPublisher{}
	server := api.NewServer(database.DB, publisher)

	orgID := uuid.New().String()
	appID := uuid.New().String()

	app := util.NewTestApplication(
		util.WithAppID(appID),
		util.WithOrganizationID(orgID),
		util.WithAppName("Test App"),
	)

	if err := database.DB.Create(&app).Error; err != nil {
		t.Fatalf("failed to create test application: %v", err)
	}

	return &testServer{
		server:    server,
		db:        database,
		publisher: publisher,
		orgID:     orgID,
		appID:     appID,
	}
}

func (ts *testServer) cleanup(t *testing.T) {
	if err := ts.db.Exec("DELETE FROM delivery_attempt").Error; err != nil {
		t.Logf("cleanup warning: %v", err)
	}
	if err := ts.db.Exec("DELETE FROM event_delivery").Error; err != nil {
		t.Logf("cleanup warning: %v", err)
	}
	if err := ts.db.Exec("DELETE FROM event").Error; err != nil {
		t.Logf("cleanup warning: %v", err)
	}
	if err := ts.db.Exec("DELETE FROM endpoint").Error; err != nil {
		t.Logf("cleanup warning: %v", err)
	}
	if err := ts.db.Exec("DELETE FROM application").Error; err != nil {
		t.Logf("cleanup warning: %v", err)
	}
	if err := ts.db.Exec("DELETE FROM idempotency_key").Error; err != nil {
		t.Logf("cleanup warning: %v", err)
	}
	ts.publisher.reset()
}

func (ts *testServer) request(method, path string, body interface{}) *httptest.ResponseRecorder {
	var reqBody []byte
	if body != nil {
		reqBody, _ = json.Marshal(body)
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	ts.server.Handler().ServeHTTP(rr, req)

	return rr
}

func (ts *testServer) requestWithHeader(method, path string, body interface{}, headers map[string]string) *httptest.ResponseRecorder {
	var reqBody []byte
	if body != nil {
		reqBody, _ = json.Marshal(body)
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	rr := httptest.NewRecorder()
	ts.server.Handler().ServeHTTP(rr, req)

	return rr
}
