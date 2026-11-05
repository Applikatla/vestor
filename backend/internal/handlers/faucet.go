package handlers

import (
	"context"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"ethglobal_mumbai/backend/internal/database"
	"ethglobal_mumbai/backend/internal/models"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
)

type FaucetRequest struct {
	Address string `json:"address" binding:"required"`
}

const (
	FaucetGasAmountWBT = 0.05 // 0.05 WBT native gas sent to user
	FaucetUSDCAmount   = 10000 // 10,000 Mock USDC sent to user
	CooldownDuration   = 24 * time.Hour
)

// GetFaucetInfo returns faucet parameters, reserve balance, and optional address claim eligibility
func GetFaucetInfo(mockUSDCAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		privateKeyHex := os.Getenv("PRIVATE_KEY")
		if privateKeyHex == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server faucet private key not configured"})
			return
		}
		privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")
		privateKey, err := crypto.HexToECDSA(privateKeyHex)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid server key"})
			return
		}

		faucetAddress := crypto.PubkeyToAddress(privateKey.PublicKey).Hex()

		rpcURL := os.Getenv("WHITECHAIN_TESTNET_RPC")
		if rpcURL == "" {
			rpcURL = "https://rpc.ankr.com/whitechain_testnet"
		}

		var reserveWBT string = "0.0"
		client, err := ethclient.Dial(rpcURL)
		if err == nil {
			defer client.Close()
			bal, err := client.BalanceAt(context.Background(), crypto.PubkeyToAddress(privateKey.PublicKey), nil)
			if err == nil {
				fBal := new(big.Float).Quo(new(big.Float).SetInt(bal), big.NewFloat(1e18))
				reserveWBT = fmt.Sprintf("%.4f", fBal)
			}
		}

		checkAddr := strings.TrimSpace(c.Query("address"))
		eligible := true
		var lastClaimAt *time.Time
		var nextClaimAt *time.Time
		var secondsRemaining int64 = 0

		if checkAddr != "" && common.IsHexAddress(checkAddr) {
			normAddr := strings.ToLower(checkAddr)
			var lastClaim models.FaucetClaim
			res := database.DB.Where("LOWER(address) = ?", normAddr).Order("created_at desc").First(&lastClaim)
			if res.Error == nil {
				elapsed := time.Since(lastClaim.CreatedAt)
				if elapsed < CooldownDuration {
					eligible = false
					lastClaimAt = &lastClaim.CreatedAt
					next := lastClaim.CreatedAt.Add(CooldownDuration)
					nextClaimAt = &next
					secondsRemaining = int64((CooldownDuration - elapsed).Seconds())
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"faucet_address":     faucetAddress,
			"faucet_reserve_wbt": reserveWBT,
			"usdc_address":       mockUSDCAddress,
			"package": gin.H{
				"usdc_amount": FaucetUSDCAmount,
				"wbt_amount":  FaucetGasAmountWBT,
				"cooldown":    "24 hours",
			},
			"eligibility": gin.H{
				"eligible":          eligible,
				"seconds_remaining": secondsRemaining,
				"last_claimed_at":   lastClaimAt,
				"next_claim_at":     nextClaimAt,
			},
		})
	}
}

// ClaimFaucet handles Google Faucet-style token distribution with 24-hour rate limiting per address.
// The faucet account pays 100% of the gas fees for the user.
func ClaimFaucet(usdcAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req FaucetRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
			return
		}

		recipient := strings.TrimSpace(req.Address)
		if !common.IsHexAddress(recipient) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid EVM recipient address. Must start with 0x and be 42 characters."})
			return
		}
		normRecipient := strings.ToLower(recipient)

		// 1. Enforce 24-hour rate limit per address
		var lastClaim models.FaucetClaim
		if err := database.DB.Where("LOWER(address) = ?", normRecipient).Order("created_at desc").First(&lastClaim).Error; err == nil {
			elapsed := time.Since(lastClaim.CreatedAt)
			if elapsed < CooldownDuration {
				remaining := CooldownDuration - elapsed
				hours := int(remaining.Hours())
				minutes := int(remaining.Minutes()) % 60
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error": fmt.Sprintf("Daily limit reached. This address already claimed tokens within the last 24 hours. You can claim again in %dh %dm.", hours, minutes),
					"seconds_remaining": int64(remaining.Seconds()),
					"next_claim_at":     lastClaim.CreatedAt.Add(CooldownDuration),
				})
				return
			}
		}

		privateKeyHex := os.Getenv("PRIVATE_KEY")
		if privateKeyHex == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server private key not configured"})
			return
		}
		privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")

		privateKey, err := crypto.HexToECDSA(privateKeyHex)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid server private key: " + err.Error()})
			return
		}

		rpcURL := os.Getenv("WHITECHAIN_TESTNET_RPC")
		if rpcURL == "" {
			rpcURL = "https://rpc.ankr.com/whitechain_testnet"
		}

		client, err := ethclient.Dial(rpcURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to Whitechain RPC: " + err.Error()})
			return
		}
		defer client.Close()

		fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
		targetAddress := common.HexToAddress(recipient)

		chainID, err := client.ChainID(context.Background())
		if err != nil {
			chainID = big.NewInt(1874)
		}

		gasPrice, err := client.SuggestGasPrice(context.Background())
		if err != nil {
			gasPrice = big.NewInt(2000000000)
		}

		nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch nonce: " + err.Error()})
			return
		}

		// 2. Transfer 0.05 WBT native gas to recipient (Faucet pays gas)
		gasTransfer := big.NewInt(50000000000000000) // 0.05 WBT = 5 * 10^16 wei
		gasTx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &targetAddress,
			Value:    gasTransfer,
			Gas:      21000,
			GasPrice: gasPrice,
			Data:     nil,
		})
		signedGasTx, err := types.SignTx(gasTx, types.NewEIP155Signer(chainID), privateKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign gas transfer: " + err.Error()})
			return
		}
		if err := client.SendTransaction(context.Background(), signedGasTx); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send WBT gas: " + err.Error()})
			return
		}
		nonce++

		// 3. Mint 10,000 Mock USDC (10,000 * 10^6) to recipient (Faucet pays gas)
		parsedABI, err := abi.JSON(strings.NewReader(`[{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"}]`))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ABI parse error: " + err.Error()})
			return
		}

		mintAmount := big.NewInt(10000000000) // 10,000 * 10^6
		data, err := parsedABI.Pack("mint", targetAddress, mintAmount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ABI pack error: " + err.Error()})
			return
		}

		usdcAddr := common.HexToAddress(usdcAddress)
		usdcTx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &usdcAddr,
			Value:    big.NewInt(0),
			Gas:      100000,
			GasPrice: gasPrice,
			Data:     data,
		})
		signedUSDCTx, err := types.SignTx(usdcTx, types.NewEIP155Signer(chainID), privateKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign USDC mint: " + err.Error()})
			return
		}
		if err := client.SendTransaction(context.Background(), signedUSDCTx); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send USDC mint: " + err.Error()})
			return
		}

		// 4. Save claim in database for 24h rate limiting
		claimRecord := models.FaucetClaim{
			Address:    normRecipient,
			IPAddress:  c.ClientIP(),
			AmountUSDC: FaucetUSDCAmount,
			AmountWBT:  fmt.Sprintf("%.2f WBT", FaucetGasAmountWBT),
			TxHashUSDC: signedUSDCTx.Hash().Hex(),
			TxHashGas:  signedGasTx.Hash().Hex(),
			CreatedAt:  time.Now().UTC(),
		}
		database.DB.Create(&claimRecord)

		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"message":     fmt.Sprintf("Successfully sent %.2f WBT gas and %d Mock USDC to %s!", FaucetGasAmountWBT, FaucetUSDCAmount, recipient),
			"recipient":   recipient,
			"usdc_tx":     signedUSDCTx.Hash().Hex(),
			"gas_tx":      signedGasTx.Hash().Hex(),
			"faucet_from": fromAddress.Hex(),
			"cooldown":    "You can request tokens again in 24 hours.",
		})
	}
}

// ResetFaucetCooldown allows testnet / demo wallets to reset their cooldown immediately
func ResetFaucetCooldown() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req FaucetRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
			return
		}

		normAddr := strings.ToLower(strings.TrimSpace(req.Address))
		database.DB.Where("LOWER(address) = ?", normAddr).Delete(&models.FaucetClaim{})

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": fmt.Sprintf("Daily cooldown reset for %s. You can claim again immediately.", req.Address),
		})
	}
}
