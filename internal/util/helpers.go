package util

import (
	"net/http"
	"time"

	"github.com/usevon/von/pkg/types"
)

// Truncate truncates a string to maxLen with no ellipsis.
func Truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

// TimePtr returns a pointer to t.
func TimePtr(t time.Time) *time.Time {
	return &t
}

// HeadersToJSONB converts map[string]string to JSONB.
func HeadersToJSONB(headers map[string]string) types.JSONB {
	jsonb := make(types.JSONB)
	for k, v := range headers {
		jsonb[k] = v
	}
	return jsonb
}

// HTTPHeadersToMap flattens http.Header to map[string]string, keeping only the first value.
func HTTPHeadersToMap(h http.Header) map[string]string {
	headers := make(map[string]string)
	for key, values := range h {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}
	return headers
}

// IntPtr returns a pointer to i.
func IntPtr(i int) *int {
	return &i
}

// StringPtr returns a pointer to s.
func StringPtr(s string) *string {
	return &s
}
