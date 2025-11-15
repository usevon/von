package middleware

import (
	"bytes"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

const (
	IdempotencyKeyHeader = "Idempotency-Key"
	IdempotencyTTL       = 24 * time.Hour
)

// responseWriter wraps http.ResponseWriter to capture response data.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	body       *bytes.Buffer
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	rw.body.Write(b)
	return rw.ResponseWriter.Write(b)
}

// IdempotencyMiddleware ensures idempotent handling of API requests.
func IdempotencyMiddleware(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			idempotencyKey := r.Header.Get(IdempotencyKeyHeader)
			if idempotencyKey == "" {
				next.ServeHTTP(w, r)
				return
			}

			var existing types.IdempotencyKey
			err := db.Where("key = ? AND expires_at > ?", idempotencyKey, time.Now()).First(&existing).Error

			if err == nil {
				// Return 200 OK for cached responses instead of the original status code
				// to indicate this is a duplicate request
				w.WriteHeader(http.StatusOK)
				w.Write([]byte(existing.ResponseBody))
				return
			}

			if err != gorm.ErrRecordNotFound {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}

			requestBody, _ := io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewBuffer(requestBody))

			rw := &responseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
				body:           &bytes.Buffer{},
			}

			next.ServeHTTP(rw, r)

			idempotencyRecord := types.IdempotencyKey{
				ID:           uuid.New().String(),
				Key:          idempotencyKey,
				Method:       r.Method,
				Path:         r.URL.Path,
				RequestBody:  string(requestBody),
				StatusCode:   rw.statusCode,
				ResponseBody: rw.body.String(),
				ExpiresAt:    time.Now().Add(IdempotencyTTL),
				CreatedAt:    time.Now(),
			}

			db.Create(&idempotencyRecord)
		})
	}
}

// CleanupExpiredKeys removes expired idempotency keys from the database.
func CleanupExpiredKeys(db *gorm.DB) error {
	return db.Where("expires_at < ?", time.Now()).Delete(&types.IdempotencyKey{}).Error
}
