package util

import (
	"os"

	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load(".env.test")
}

func GetPostgresURL() string {
	if url := os.Getenv("POSTGRES_URL"); url != "" {
		return url
	}
	return "postgres://von:von_dev_password@localhost:5432/von_dev?sslmode=disable"
}

func GetRabbitMQURL() string {
	if url := os.Getenv("RABBITMQ_URL"); url != "" {
		return url
	}
	return "amqp://von:von_dev_password@localhost:5672/"
}
