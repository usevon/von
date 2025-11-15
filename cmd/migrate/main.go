package main

import (
	"fmt"
	"log"
	"os"

	"github.com/usevon/von/internal/db"
)

func main() {
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		connString = "postgresql://von:von_dev_password@localhost:5432/von_dev?sslmode=disable"
	}

	fmt.Println("Connecting to database...")
	database, err := db.New(connString)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	fmt.Println("Running auto migrations...")
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	fmt.Println("✅ Migrations completed successfully!")
}
