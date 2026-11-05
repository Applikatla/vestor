package models

import (
	"time"
)

// FaucetClaim tracks rate-limited testnet faucet distributions (1 claim per 24 hours per address)
type FaucetClaim struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Address    string    `gorm:"index;not null" json:"address"`
	IPAddress  string    `json:"ip_address"`
	AmountUSDC uint64    `json:"amount_usdc"`
	AmountWBT  string    `json:"amount_wbt"`
	TxHashUSDC string    `json:"tx_hash_usdc"`
	TxHashGas  string    `json:"tx_hash_gas"`
	CreatedAt  time.Time `json:"created_at"`
}

