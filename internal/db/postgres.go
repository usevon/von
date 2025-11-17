package db

import (
	"fmt"
	"time"

	"github.com/usevon/von/pkg/types"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB wraps gorm.DB with additional methods.
type DB struct {
	*gorm.DB
}

// New returns a new database connection using the provided connection string.
func New(connString string) (*DB, error) {
	db, err := gorm.Open(postgres.Open(connString), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info),
		PrepareStmt: true, // Enable prepared statement caching for better performance
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Configure connection pool for high-throughput webhook delivery
	sqlDB.SetMaxOpenConns(100)                  // Maximum open connections
	sqlDB.SetMaxIdleConns(10)                   // Idle connections to keep alive
	sqlDB.SetConnMaxLifetime(time.Hour)         // Maximum lifetime of a connection
	sqlDB.SetConnMaxIdleTime(10 * time.Minute) // Maximum idle time before closing

	return &DB{DB: db}, nil
}

// AutoMigrate runs database migrations for core webhook tables.
// Auth tables (user, organization, member, apikey) are managed by the dashboard via Drizzle.
func (db *DB) AutoMigrate() error {
	return db.DB.AutoMigrate(
		&types.Application{},
		&types.Endpoint{},
		&types.Event{},
		&types.EventDelivery{},
		&types.DeliveryAttempt{},
		&types.EventSchema{},
		&types.UsageMetrics{},
		&types.TunnelSession{},
		&types.IdempotencyKey{},
	)
}

// Close closes the database connection.
func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
