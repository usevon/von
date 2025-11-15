package db

import (
	"fmt"

	"github.com/usevon/von/pkg/types"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DB struct {
	*gorm.DB
}

func New(connString string) (*DB, error) {
	db, err := gorm.Open(postgres.Open(connString), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
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

	return &DB{DB: db}, nil
}

func (db *DB) AutoMigrate() error {
	// Only migrate core webhook tables
	// Auth tables (user, organization, member, apikey) are managed by the dashboard via Drizzle
	return db.DB.AutoMigrate(
		&types.Application{},
		&types.Endpoint{},
		&types.Event{},
		&types.EventDelivery{},
		&types.DeliveryAttempt{},
		&types.EventSchema{},
		&types.UsageMetrics{},
		&types.TunnelSession{},
	)
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
