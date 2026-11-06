package outbox

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"tokenization_inventory/backend/internal/database"
	"tokenization_inventory/backend/internal/domain"
)

type Worker struct {
	repo      *database.Repository
	processor *OutboxProcessor
	pollFreq  time.Duration
	stopCh    chan struct{}
}

func NewWorker(repo *database.Repository, adapterBaseURL string, pollFreq time.Duration) *Worker {
	if pollFreq <= 0 {
		pollFreq = 2 * time.Second
	}
	return &Worker{
		repo:      repo,
		processor: NewOutboxProcessor(adapterBaseURL),
		pollFreq:  pollFreq,
		stopCh:    make(chan struct{}),
	}
}

func (w *Worker) Start(ctx context.Context) {
	log.Printf("[Outbox Worker] Starting worker loop (polling every %v)...\n", w.pollFreq)
	ticker := time.NewTicker(w.pollFreq)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Outbox Worker] Context canceled, stopping worker.")
			return
		case <-w.stopCh:
			log.Println("[Outbox Worker] Stop signaled, exiting.")
			return
		case <-ticker.C:
			w.processPending(ctx)
		}
	}
}

func (w *Worker) Stop() {
	close(w.stopCh)
}

func (w *Worker) processPending(ctx context.Context) {
	messages, err := w.repo.GetPendingOutboxMessages(ctx, 10)
	if err != nil {
		// Suppress spamming logs if DB is starting up
		return
	}

	for _, msg := range messages {
		w.processMessage(ctx, msg)
	}
}

func (w *Worker) processMessage(ctx context.Context, msg *domain.OutboxMessage) {
	log.Printf("[Outbox Worker] Processing message %s (Type: %s, Aggregate: %s)\n",
		msg.ID, msg.EventType, msg.AggregateID)

	var endpoint string
	switch msg.EventType {
	case "INVENTORY_REGISTRATION_REQUESTED":
		endpoint = "/internal/v1/registry/register"
	case "TOKEN_DEPLOYMENT_REQUESTED":
		endpoint = "/internal/v1/tokens/deploy"
	case "SALE_ATTESTATION_REQUESTED":
		endpoint = "/internal/v1/sales/attest"
	case "DISTRIBUTION_CREATION_REQUESTED":
		endpoint = "/internal/v1/distributions/create"
	default:
		log.Printf("[Outbox Worker] Unknown event type: %s, skipping.\n", msg.EventType)
		_ = w.repo.UpdateOutboxStatus(ctx, msg.ID, domain.OutboxStatusFailed)
		return
	}

	resp, err := w.processor.Dispatch(msg, endpoint)
	if err != nil {
		log.Printf("[Outbox Worker] Dispatch error for %s: %v\n", msg.ID, err)
		_ = w.repo.UpdateOutboxStatus(ctx, msg.ID, domain.OutboxStatusFailed)
		return
	}

	// Process adapter response
	if success, ok := resp["success"].(bool); ok && success {
		txHash, _ := resp["txHash"].(string)
		log.Printf("[Outbox Worker] Successfully broadcast tx %s for %s\n", txHash, msg.ID)

		if msg.EventType == "INVENTORY_REGISTRATION_REQUESTED" {
			// Extract registry address and update inventory
			var payload struct {
				RegistryAddress string `json:"registryAddress"`
			}
			_ = json.Unmarshal([]byte(msg.Payload), &payload)

			_ = w.repo.UpdateInventoryChainStatus(
				ctx,
				msg.AggregateID,
				domain.InventoryStatusRegistered,
				11155111, // Sepolia
				payload.RegistryAddress,
				txHash,
			)
		}

		_ = w.repo.UpdateOutboxStatus(ctx, msg.ID, domain.OutboxStatusConfirmed)
	} else {
		errStr, _ := resp["error"].(string)
		log.Printf("[Outbox Worker] Adapter returned error for %s: %s\n", msg.ID, errStr)
		_ = w.repo.UpdateOutboxStatus(ctx, msg.ID, domain.OutboxStatusFailed)
	}
}
