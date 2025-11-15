package api

import (
	"encoding/json"
	"net/http"
)

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details any    `json:"details,omitempty"`
}

type SuccessResponse struct {
	Data any `json:"data"`
}

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func Success(w http.ResponseWriter, data any) {
	JSON(w, http.StatusOK, SuccessResponse{Data: data})
}

func Created(w http.ResponseWriter, data any) {
	JSON(w, http.StatusCreated, SuccessResponse{Data: data})
}

func Error(w http.ResponseWriter, status int, message string, code string) {
	JSON(w, status, ErrorResponse{
		Error: message,
		Code:  code,
	})
}

func BadRequest(w http.ResponseWriter, message string) {
	Error(w, http.StatusBadRequest, message, "bad_request")
}

func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, message, "unauthorized")
}

func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, message, "not_found")
}

func InternalError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, message, "internal_error")
}
