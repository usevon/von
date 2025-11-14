package api

import (
	"encoding/json"
	"log"
	"net/http"
)

type Server struct {
	mux *http.ServeMux
}

func NewServer() *Server {
	s := &Server{
		mux: http.NewServeMux(),
	}

	s.registerRoutes()
	return s
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/api/webhooks/send", s.handleSend)
	s.mux.HandleFunc("/api/webhooks/receive", s.handleReceive)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Parse request, validate, publish to RabbitMQ
	log.Println("Webhook send request received")

	json.NewEncoder(w).Encode(map[string]string{
		"status": "queued",
		"id":     "webhook-123",
	})
}

func (s *Server) handleReceive(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Verify signature, validate, process webhook
	log.Println("Webhook receive request received")

	w.WriteHeader(http.StatusOK)
}

func (s *Server) Start(addr string) error {
	return http.ListenAndServe(addr, s.mux)
}
