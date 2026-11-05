package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"ethglobal_mumbai/backend/internal/database"
	"ethglobal_mumbai/backend/internal/handlers"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

type DeploymentsFile struct {
	Network   string            `json:"network"`
	Deployer  string            `json:"deployer"`
	Contracts map[string]string `json:"contracts"`
}

func main() {
	// 1. Load environment variables
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 2. Read deployed contract addresses from deployments.json
	deploymentsPath := os.Getenv("DEPLOYMENTS_PATH")
	if deploymentsPath == "" {
		deploymentsPath = "../deployments.json"
	}

	var registryAddress string
	var vaultAddress string
	var mockUSDCAddress string

	data, err := os.ReadFile(deploymentsPath)
	if err == nil {
		var dep DeploymentsFile
		if err := json.Unmarshal(data, &dep); err == nil {
			registryAddress = dep.Contracts["InventoryRegistry"]
			vaultAddress = dep.Contracts["FinancingVault"]
			mockUSDCAddress = dep.Contracts["MockUSDC"]
			log.Printf("📦 Loaded On-Chain Deployments (%s):", dep.Network)
			log.Printf("   - InventoryRegistry: %s", registryAddress)
			log.Printf("   - FinancingVault:    %s", vaultAddress)
			log.Printf("   - MockUSDC:          %s", mockUSDCAddress)
		}
	} else {
		// Fallback to live Whitechain testnet defaults if deployments.json not found
		registryAddress = "0x455664702375c9EfDE6B8C0eEC1131C0Ff076Ab1"
		vaultAddress = "0xd0E9BeDCe54Ab0Dde3893f9911B790Eec26D52dD"
		mockUSDCAddress = "0xD2438B3A2DA2DAF0BE024726120BE240Fe4e49f5"
		log.Printf("⚠️  Using default Whitechain testnet contract addresses")
	}

	// 3. Initialize Database
	database.InitDB()

	// 4. Initialize HTTP Server
	r := gin.Default()

	// Configure CORS for React/Next.js frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health Check & Platform Info
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC(),
		})
	})

	r.GET("/api/contracts", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"network": "Whitechain Testnet (Chain ID 1874)",
			"contracts": gin.H{
				"InventoryRegistry": registryAddress,
				"FinancingVault":    vaultAddress,
				"MockUSDC":          mockUSDCAddress,
			},
		})
	})

	// Core API Routes
	api := r.Group("/api")
	{
		// Company & Verification
		api.POST("/companies/register", handlers.RegisterCompany)
		api.POST("/investors/allowlist", handlers.AllowlistInvestor(vaultAddress))

		// Inventory Lifecycle (Input -> Hash -> Stored -> Blockchain Ready)
		api.POST("/inventories", handlers.CreateInventory(registryAddress))
		api.GET("/inventories", handlers.GetInventories)
		api.GET("/inventories/:id", handlers.GetInventoryByID)
		api.POST("/inventories/:id/confirm-registration", handlers.ConfirmRegistration)
		api.POST("/inventories/:id/inspection", handlers.RecordInspection)
		api.POST("/inventories/:id/confirm-issuance", handlers.ConfirmIssuance)

		// Warehouse Telemetry / ERP Event Ingestion
		api.POST("/inventories/:id/events", handlers.IngestWarehouseEvent)
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("🚀 RWA Backend Server listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}

func init() {
	// Set working directory to project root or backend directory if needed
	_ = filepath.Base("")
}

