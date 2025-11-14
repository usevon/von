package db

import (
	"database/sql"
	_ "github.com/lib/pq"
)

type DB struct {
	conn *sql.DB
}

func New(connString string) (*DB, error) {
	conn, err := sql.Open("postgres", connString)
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(); err != nil {
		return nil, err
	}

	return &DB{conn: conn}, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

// TODO: Add methods for webhook_logs, webhook_events, webhook_attempts
