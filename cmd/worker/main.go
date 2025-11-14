package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/usevon/von/internal/worker"
)

func main() {
	log.Println("Worker starting...")

	w, err := worker.New()
	if err != nil {
		log.Fatal(err)
	}

	// Start worker
	if err := w.Start(); err != nil {
		log.Fatal(err)
	}

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down worker...")
	w.Stop()
}
