package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/db"
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

	database.DB.Exec("DELETE FROM idempotency_keys")

	return database
}

func TestIdempotencyMiddleware_NoKey(t *testing.T) {
	database := setupTestDB(t)

	handler := IdempotencyMiddleware(database.DB)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	}))

	req := httptest.NewRequest("POST", "/api/events", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	if w.Body.String() != "success" {
		t.Errorf("expected 'success', got %s", w.Body.String())
	}

	var count int64
	database.DB.Model(&types.IdempotencyKey{}).Count(&count)
	if count != 0 {
		t.Errorf("expected 0 idempotency keys, got %d", count)
	}
}

func TestIdempotencyMiddleware_FirstRequest(t *testing.T) {
	database := setupTestDB(t)

	handler := IdempotencyMiddleware(database.DB)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"123"}`))
	}))

	idempotencyKey := uuid.New().String()
	req := httptest.NewRequest("POST", "/api/events", bytes.NewBufferString(`{"event":"test"}`))
	req.Header.Set(IdempotencyKeyHeader, idempotencyKey)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", w.Code)
	}

	if w.Body.String() != `{"id":"123"}` {
		t.Errorf("expected correct response, got %s", w.Body.String())
	}

	var stored types.IdempotencyKey
	err := database.DB.Where("key = ?", idempotencyKey).First(&stored).Error
	if err != nil {
		t.Fatalf("expected idempotency key to be stored: %v", err)
	}

	if stored.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", stored.StatusCode)
	}

	if stored.ResponseBody != `{"id":"123"}` {
		t.Errorf("expected response body to match, got %s", stored.ResponseBody)
	}
}

func TestIdempotencyMiddleware_DuplicateRequest(t *testing.T) {
	database := setupTestDB(t)

	callCount := 0
	handler := IdempotencyMiddleware(database.DB)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"123"}`))
	}))

	idempotencyKey := uuid.New().String()
	req1 := httptest.NewRequest("POST", "/api/events", bytes.NewBufferString(`{"event":"test"}`))
	req1.Header.Set(IdempotencyKeyHeader, idempotencyKey)
	w1 := httptest.NewRecorder()

	handler.ServeHTTP(w1, req1)

	if callCount != 1 {
		t.Errorf("expected handler to be called once, got %d", callCount)
	}

	req2 := httptest.NewRequest("POST", "/api/events", bytes.NewBufferString(`{"event":"test"}`))
	req2.Header.Set(IdempotencyKeyHeader, idempotencyKey)
	w2 := httptest.NewRecorder()

	handler.ServeHTTP(w2, req2)

	if callCount != 1 {
		t.Errorf("expected handler to still be called once, got %d", callCount)
	}

	if w2.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", w2.Code)
	}

	body, _ := io.ReadAll(w2.Body)
	if string(body) != `{"id":"123"}` {
		t.Errorf("expected cached response, got %s", string(body))
	}
}

func TestIdempotencyMiddleware_ExpiredKey(t *testing.T) {
	database := setupTestDB(t)

	idempotencyKey := uuid.New().String()
	expiredRecord := types.IdempotencyKey{
		ID:           uuid.New().String(),
		Key:          idempotencyKey,
		Method:       "POST",
		Path:         "/api/events",
		RequestBody:  `{"event":"test"}`,
		StatusCode:   http.StatusCreated,
		ResponseBody: `{"id":"old"}`,
		ExpiresAt:    time.Now().Add(-1 * time.Hour),
		CreatedAt:    time.Now().Add(-25 * time.Hour),
	}
	database.DB.Create(&expiredRecord)

	callCount := 0
	handler := IdempotencyMiddleware(database.DB)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"new"}`))
	}))

	req := httptest.NewRequest("POST", "/api/events", bytes.NewBufferString(`{"event":"test"}`))
	req.Header.Set(IdempotencyKeyHeader, idempotencyKey)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if callCount != 1 {
		t.Errorf("expected handler to be called for expired key, got %d calls", callCount)
	}

	body, _ := io.ReadAll(w.Body)
	if string(body) != `{"id":"new"}` {
		t.Errorf("expected new response, got %s", string(body))
	}
}

func TestCleanupExpiredKeys(t *testing.T) {
	database := setupTestDB(t)

	expiredKey := types.IdempotencyKey{
		ID:           uuid.New().String(),
		Key:          "expired-key",
		Method:       "POST",
		Path:         "/api/events",
		RequestBody:  `{}`,
		StatusCode:   200,
		ResponseBody: `{}`,
		ExpiresAt:    time.Now().Add(-1 * time.Hour),
		CreatedAt:    time.Now().Add(-25 * time.Hour),
	}
	database.DB.Create(&expiredKey)

	validKey := types.IdempotencyKey{
		ID:           uuid.New().String(),
		Key:          "valid-key",
		Method:       "POST",
		Path:         "/api/events",
		RequestBody:  `{}`,
		StatusCode:   200,
		ResponseBody: `{}`,
		ExpiresAt:    time.Now().Add(23 * time.Hour),
		CreatedAt:    time.Now(),
	}
	database.DB.Create(&validKey)

	err := CleanupExpiredKeys(database.DB)
	if err != nil {
		t.Fatalf("cleanup failed: %v", err)
	}

	var count int64
	database.DB.Model(&types.IdempotencyKey{}).Count(&count)
	if count != 1 {
		t.Errorf("expected 1 key remaining, got %d", count)
	}

	var remaining types.IdempotencyKey
	database.DB.First(&remaining)
	if remaining.Key != "valid-key" {
		t.Errorf("expected valid-key to remain, got %s", remaining.Key)
	}
}
