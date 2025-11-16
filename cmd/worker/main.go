package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/worker"
)

func main() {
	log.Println("Worker starting...")

	// Load configuration from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://von:von_dev_password@localhost:5432/von_dev?sslmode=disable"
	}

	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://von:von_dev_password@localhost:5672/"
	}

	// Connect to database
	database, err := db.New(databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Run migrations
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	// Create worker with 30 second HTTP timeout
	w, err := worker.NewWorker(database.DB, rabbitmqURL, 30*time.Second)
	if err != nil {
		log.Fatalf("failed to create worker: %v", err)
	}

	// Start worker
	if err := w.Start(); err != nil {
		log.Fatalf("failed to start worker: %v", err)
	}

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down worker...")
	if err := w.Stop(); err != nil {
		log.Printf("error stopping worker: %v", err)
	}
}
