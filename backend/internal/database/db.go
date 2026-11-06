package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func Connect(ctx context.Context, databaseURL string) (*DB, error) {
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgrespassword@localhost:5432/tokenization_inventory?sslmode=disable"
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 2
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("[DB] Successfully connected to PostgreSQL!")
	return &DB{Pool: pool}, nil
}

func (db *DB) RunMigrations(ctx context.Context, migrationPath string) error {
	log.Printf("[DB] Running schema migrations from: %s\n", migrationPath)
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		return fmt.Errorf("failed reading migration file: %w", err)
	}

	_, err = db.Pool.Exec(ctx, string(content))
	if err != nil {
		return fmt.Errorf("failed applying schema migration: %w", err)
	}

	log.Println("[DB] Schema migrations applied successfully!")
	return nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}
