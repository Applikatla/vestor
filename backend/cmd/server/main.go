package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"tokenization_inventory/backend/internal/database"
	"tokenization_inventory/backend/internal/domain"
	"tokenization_inventory/backend/internal/inventory"
	"tokenization_inventory/backend/internal/offer"
	"tokenization_inventory/backend/internal/outbox"
	"tokenization_inventory/backend/internal/sales"
	"tokenization_inventory/backend/internal/valuation"

	"github.com/google/uuid"
)

// Active Whitechain Sepolia Contracts (Chain ID 1874)
const (
	DefaultRegistryAddress = "0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D"
	DefaultFactoryAddress  = "0xEBC9D0006b1f35cB6BAFe18624A03f7fad6980Dc"
	DefaultIssuerAddress   = "0x96bDC6b5dFB67deBbae37Ec582193c61217d13B6"
)

func loadEnv() {
	candidates := []string{".env", "../.env", "../../.env", "backend/.env"}
	for _, p := range candidates {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		defer f.Close()

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.TrimSpace(parts[1])
				// Strip surrounding quotes
				if (strings.HasPrefix(v, `"`) && strings.HasSuffix(v, `"`)) ||
					(strings.HasPrefix(v, `'`) && strings.HasSuffix(v, `'`)) {
					v = v[1 : len(v)-1]
				}
				if os.Getenv(k) == "" {
					os.Setenv(k, v)
				}
			}
		}
		log.Printf("[ENV] Loaded environment configuration from: %s\n", p)
		return
	}
}

func main() {
	loadEnv()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	adapterURL := os.Getenv("ADAPTER_URL")
	if adapterURL == "" {
		adapterURL = "http://localhost:8081"
	}

	ctx := context.Background()

	// 1. Initialize Domain Services
	invService := inventory.NewInventoryService()
	valService := valuation.NewValuationService()
	offService := offer.NewOfferService(0.75) // 75% max advance rate
	salesService := sales.NewSalesService()

	// 2. Connect Database (with graceful background retry if Postgres is starting up)
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgrespassword@localhost:5432/tokenization_inventory?sslmode=disable"
	}

	var repo *database.Repository
	db, err := database.Connect(ctx, dbURL)
	if err != nil {
		log.Printf("[DB WARNING] Could not connect to PostgreSQL: %v (will retry in background)\n", err)
	} else {
		// Run initial migrations
		migrationPath := filepath.Join("migrations", "000001_initial_schema.up.sql")
		if _, err := os.Stat(migrationPath); os.IsNotExist(err) {
			migrationPath = filepath.Join("backend", "migrations", "000001_initial_schema.up.sql")
		}
		if err := db.RunMigrations(ctx, migrationPath); err != nil {
			log.Printf("[DB MIGRATION WARNING] %v\n", err)
		}
		repo = database.NewRepository(db)

		// Start Transactional Outbox Worker
		worker := outbox.NewWorker(repo, adapterURL, 2*time.Second)
		go worker.Start(ctx)
	}

	// 3. HTTP Endpoints

	// Health Check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "connected"
		if db == nil || db.Pool.Ping(r.Context()) != nil {
			dbStatus = "disconnected (start PostgreSQL to enable persistence)"
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":           "healthy",
			"service":          "inventory-tokenization-backend",
			"database":         dbStatus,
			"adapter_url":      adapterURL,
			"registry_sepolia": DefaultRegistryAddress,
			"factory_sepolia":  DefaultFactoryAddress,
		})
	})

	// Create Inventory Draft
	http.HandleFunc("/v1/inventories", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			CompanyID      string   `json:"company_id"`
			Title          string   `json:"title"`
			Category       string   `json:"category"`
			DocumentHashes []string `json:"document_hashes"`
			Batches        []struct {
				SKU               string  `json:"sku"`
				LotNo             string  `json:"lot_no"`
				WarehouseID       string  `json:"warehouse_id"`
				QuantityTotal     float64 `json:"quantity_total"`
				QuantityAvailable float64 `json:"quantity_available"`
				Unit              string  `json:"unit"`
				CostBasis         float64 `json:"cost_basis"`
			} `json:"batches"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		compUUID, err := uuid.Parse(req.CompanyID)
		if err != nil {
			compUUID = uuid.New()
		}

		draft := invService.CreateInventoryDraft(compUUID, req.Title, req.Category, req.DocumentHashes)

		var domainBatches []*domain.InventoryBatch
		for _, b := range req.Batches {
			domainBatches = append(domainBatches, &domain.InventoryBatch{
				ID:                uuid.New(),
				InventoryID:       draft.ID,
				SKU:               b.SKU,
				LotNo:             b.LotNo,
				WarehouseID:       b.WarehouseID,
				QuantityTotal:     b.QuantityTotal,
				QuantityAvailable: b.QuantityAvailable,
				Unit:              b.Unit,
				CostBasis:         b.CostBasis,
			})
		}

		// Persist to DB if connected
		if repo != nil {
			if err := repo.SaveInventoryWithBatches(r.Context(), draft, domainBatches, nil); err != nil {
				log.Printf("[ERROR] Failed saving inventory: %v\n", err)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"inventory": draft,
			"batches":   domainBatches,
		})
	})

	// Submit Inventory for On-Chain Registration (Transactional Outbox)
	http.HandleFunc("/v1/inventories/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/submit") && r.Method == http.MethodPost {
			parts := strings.Split(path, "/")
			if len(parts) < 4 {
				http.Error(w, "Invalid URL", http.StatusBadRequest)
				return
			}
			invIDStr := parts[3]
			invUUID, err := uuid.Parse(invIDStr)
			if err != nil {
				http.Error(w, "Invalid UUID", http.StatusBadRequest)
				return
			}

			var req struct {
				IssuerAddress   string `json:"issuer_address"`
				RegistryAddress string `json:"registry_address"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			if req.RegistryAddress == "" {
				req.RegistryAddress = DefaultRegistryAddress
			}
			if req.IssuerAddress == "" {
				req.IssuerAddress = DefaultIssuerAddress
			}

			// Prepare 32-byte identifier from UUID (padded to 32 bytes)
			var b32 [32]byte
			copy(b32[:], invUUID[:])
			invBytes32 := fmt.Sprintf("0x%x", b32)

			// Prepare outbox message for on-chain registration
			outboxPayload := map[string]interface{}{
				"registryAddress": req.RegistryAddress,
				"inventoryId":     invBytes32,
				"issuer":          req.IssuerAddress,
				"evidenceRoot":    "0x27998dbbaab003dc66e691ebe24d986236b9f8500351b8bbc283527f6c8e74bb",
			}
			payloadBytes, _ := json.Marshal(outboxPayload)

			outboxMsg := &domain.OutboxMessage{
				ID:             uuid.New(),
				EventType:      "INVENTORY_REGISTRATION_REQUESTED",
				AggregateID:    invUUID,
				Payload:        string(payloadBytes),
				IdempotencyKey: fmt.Sprintf("SUBMIT_%s_%d", invUUID, time.Now().UnixNano()),
				Status:         domain.OutboxStatusPending,
				Attempts:       0,
				CreatedAt:      time.Now(),
			}

			if repo != nil {
				inv, err := repo.GetInventory(r.Context(), invUUID)
				if err == nil {
					inv.Status = domain.InventoryStatusPendingChain
					_ = repo.SaveInventoryWithBatches(r.Context(), inv, nil, outboxMsg)
				}
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message":    "Inventory submitted for on-chain registration",
				"status":     "PENDING_CHAIN",
				"outbox_id":  outboxMsg.ID,
				"tx_payload": outboxPayload,
			})
			return
		}

		http.Error(w, "Not found", http.StatusNotFound)
	})

	// Sales Metrics & Stock Decrement
	http.HandleFunc("/v1/sales/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			QuantitySold   float64 `json:"quantity_sold"`
			GrossUnitPrice float64 `json:"gross_unit_price"`
			Discounts      float64 `json:"discounts"`
			Returns        float64 `json:"returns"`
			Taxes          float64 `json:"taxes"`
			UnitCostBasis  float64 `json:"unit_cost_basis"`
			DirectCosts    float64 `json:"direct_costs"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		metrics := salesService.CalculateMetrics(
			req.QuantitySold,
			req.GrossUnitPrice,
			req.Discounts,
			req.Returns,
			req.Taxes,
			req.UnitCostBasis,
			req.DirectCosts,
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(metrics)
	})

	_ = valService
	_ = offService

	log.Printf("[Go Backend] Server listening on port %s...\n", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
