package main

import (
	"log"
	"os"

	"github.com/usevon/von/internal/api"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/usage"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://von:von_dev_password@localhost:5432/von_dev?sslmode=disable"
	}

	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://von:von_dev_password@localhost:5672/"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	database, err := db.New(databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	publisher, err := queue.NewPublisher(rabbitmqURL)
	if err != nil {
		log.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	aggregator, err := usage.NewAggregator(database.DB, rabbitmqURL)
	if err != nil {
		log.Fatalf("failed to create usage aggregator: %v", err)
	}
	defer aggregator.Stop()

	go aggregator.Start()

	server := api.NewServer(database.DB, publisher)

	log.Printf("Starting API server on port %s", port)
	if err := server.Start(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
