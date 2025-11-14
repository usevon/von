package worker

import (
	"log"
)

type Worker struct {
	// TODO: Add RabbitMQ consumer, DB connection
	stopChan chan struct{}
}

func New() (*Worker, error) {
	// TODO: Initialize RabbitMQ connection, DB connection
	return &Worker{
		stopChan: make(chan struct{}),
	}, nil
}

func (w *Worker) Start() error {
	log.Println("Worker started, waiting for messages...")

	// TODO: Start consuming from RabbitMQ queue
	go w.consume()

	return nil
}

func (w *Worker) consume() {
	for {
		select {
		case <-w.stopChan:
			return
		default:
			// TODO: Consume message from queue
			// TODO: Send webhook with retry logic
			// TODO: Log to database
		}
	}
}

func (w *Worker) Stop() {
	close(w.stopChan)
	// TODO: Close RabbitMQ connection, DB connection
	log.Println("Worker stopped")
}
