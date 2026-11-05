package database

import (
	"log"
	"os"

	"ethglobal_mumbai/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes PostgreSQL connection, with graceful SQLite fallback for seamless local testing.
func InitDB() *gorm.DB {
	var err error
	dsn := os.Getenv("DATABASE_URL")

	if dsn != "" {
		log.Printf("[DB] Connecting to PostgreSQL...")
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			log.Println("[DB] Successfully connected to PostgreSQL!")
		} else {
			log.Printf("[DB] PostgreSQL connection failed: %v. Falling back to local SQLite...", err)
		}
	}

	if DB == nil {
		sqlitePath := os.Getenv("SQLITE_PATH")
		if sqlitePath == "" {
			sqlitePath = "inventory_platform.db"
		}
		log.Printf("[DB] Initializing SQLite database at %s...", sqlitePath)
		DB, err = gorm.Open(sqlite.Open(sqlitePath), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("[DB] Fatal: Failed to initialize SQLite database: %v", err)
		}
		log.Println("[DB] Successfully connected to SQLite database!")
	}

	// Auto-migrate tables
	log.Println("[DB] Running schema auto-migrations...")
	err = DB.AutoMigrate(
		&models.Company{},
		&models.Inventory{},
		&models.InventoryItem{},
		&models.InventoryDocument{},
		&models.WarehouseEvent{},
	)
	if err != nil {
		log.Fatalf("[DB] Schema migration failed: %v", err)
	}

	log.Println("[DB] Database migrations completed successfully!")
	return DB
}

