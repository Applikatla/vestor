package services

import (
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"ethglobal_mumbai/backend/internal/models"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/google/uuid"
)

// CanonicalPayload represents the normalized structure hashed for the on-chain commitment.
type CanonicalPayload struct {
	IssuerAddress     string                  `json:"issuer_address"`
	WarehouseID       string                  `json:"warehouse_id"`
	WarehouseLocation string                  `json:"warehouse_location"`
	Items             []CanonicalItemPayload  `json:"items"`
	Documents         []CanonicalDocPayload   `json:"documents"`
	Salt              string                  `json:"salt"`
}

type CanonicalItemPayload struct {
	SKU         string  `json:"sku"`
	Quantity    uint    `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	BatchNumber string  `json:"batch_number"`
}

type CanonicalDocPayload struct {
	DocType string `json:"doc_type"`
	DocURI  string `json:"doc_uri"`
	DocHash string `json:"doc_hash"`
}

// GenerateInventoryID produces a unique 32-byte (bytes32) hex string for the blockchain.
func GenerateInventoryID(issuer string, warehouseID string) (string, string) {
	internalUUID := uuid.New().String()
	rawBytes := []byte(fmt.Sprintf("%s:%s:%s:%d", internalUUID, issuer, warehouseID, time.Now().UnixNano()))
	hash := crypto.Keccak256Hash(rawBytes)
	return internalUUID, hash.Hex()
}

// CalculateCanonicalRecordHash generates a deterministic keccak256 hash across all SKU and warehouse data.
func CalculateCanonicalRecordHash(inv *models.Inventory) (string, error) {
	var itemPayloads []CanonicalItemPayload
	for _, item := range inv.Items {
		itemPayloads = append(itemPayloads, CanonicalItemPayload{
			SKU:         item.SKU,
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
			BatchNumber: item.BatchNumber,
		})
	}

	// Sort items deterministically by SKU to guarantee reproducible hash
	sort.Slice(itemPayloads, func(i, j int) bool {
		return itemPayloads[i].SKU < itemPayloads[j].SKU
	})

	var docPayloads []CanonicalDocPayload
	for _, doc := range inv.Documents {
		docPayloads = append(docPayloads, CanonicalDocPayload{
			DocType: doc.DocType,
			DocURI:  doc.DocURI,
			DocHash: doc.DocHash,
		})
	}

	// Sort documents deterministically by URI
	sort.Slice(docPayloads, func(i, j int) bool {
		return docPayloads[i].DocURI < docPayloads[j].DocURI
	})

	payload := CanonicalPayload{
		IssuerAddress:     inv.IssuerAddress,
		WarehouseID:       inv.WarehouseID,
		WarehouseLocation: inv.WarehouseLocation,
		Items:             itemPayloads,
		Documents:         docPayloads,
		Salt:              inv.ID, // Links to internal ID
	}

	canonicalJSON, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal canonical payload: %w", err)
	}

	hashBytes := crypto.Keccak256(canonicalJSON)
	return hexutil.Encode(hashBytes), nil
}

