package main

import (
	"log"
	"os"

	"github.com/usevon/von/internal/api"
)

func main() {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "3000"
	}

	server := api.NewServer()

	log.Printf("API server starting on port %s", port)
	if err := server.Start(":" + port); err != nil {
		log.Fatal(err)
	}
}
