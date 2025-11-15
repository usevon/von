package api

import (
	"encoding/json"
	"net/http"
	"strings"
)

// ErrorResponse represents a structured API error response.
type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details any    `json:"details,omitempty"`
}

// JSON replies to the request with a JSON-encoded body and the given status code.
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Success replies to the request with HTTP 200 OK and the given data.
func Success(w http.ResponseWriter, data any) {
	JSON(w, http.StatusOK, data)
}

// Created replies to the request with HTTP 201 Created and the given data.
func Created(w http.ResponseWriter, data any) {
	JSON(w, http.StatusCreated, data)
}

// Error replies to the request with an error response containing the given status, message, and code.
func Error(w http.ResponseWriter, status int, message string, code string) {
	JSON(w, status, ErrorResponse{
		Error: message,
		Code:  code,
	})
}

// BadRequest replies to the request with HTTP 400 Bad Request.
func BadRequest(w http.ResponseWriter, message string) {
	Error(w, http.StatusBadRequest, message, "bad_request")
}

// Unauthorized replies to the request with HTTP 401 Unauthorized.
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, message, "unauthorized")
}

// NotFound replies to the request with HTTP 404 Not Found.
func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, message, "not_found")
}

// InternalError replies to the request with HTTP 500 Internal Server Error.
func InternalError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, message, "internal_error")
}

// isInvalidUUIDError reports whether the error is a PostgreSQL UUID syntax error.
func isInvalidUUIDError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	return strings.Contains(errMsg, "invalid input syntax for type uuid") ||
		strings.Contains(errMsg, "SQLSTATE 22P02")
}
