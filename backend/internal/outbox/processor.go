package outbox

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"tokenization_inventory/backend/internal/domain"
)

type OutboxProcessor struct {
	AdapterBaseURL string
	HTTPClient     *http.Client
}

func NewOutboxProcessor(adapterBaseURL string) *OutboxProcessor {
	return &OutboxProcessor{
		AdapterBaseURL: adapterBaseURL,
		HTTPClient:     &http.Client{Timeout: 10 * time.Second},
	}
}

// Dispatch sends a message to the Node.js adapter endpoint
func (p *OutboxProcessor) Dispatch(msg *domain.OutboxMessage, endpoint string) (map[string]interface{}, error) {
	msg.Status = domain.OutboxStatusProcessing
	msg.Attempts++

	url := fmt.Sprintf("%s%s", p.AdapterBaseURL, endpoint)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(msg.Payload)))
	if err != nil {
		msg.Status = domain.OutboxStatusFailed
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Idempotency-Key", msg.IdempotencyKey)

	resp, err := p.HTTPClient.Do(req)
	if err != nil {
		msg.Status = domain.OutboxStatusFailed
		return nil, fmt.Errorf("failed calling blockchain adapter: %w", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		msg.Status = domain.OutboxStatusFailed
		return nil, err
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		msg.Status = domain.OutboxStatusBroadcast
	} else {
		msg.Status = domain.OutboxStatusFailed
	}

	return result, nil
}
