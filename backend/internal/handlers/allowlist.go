package handlers

import (
	"context"
	"math/big"
	"net/http"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
)

type AllowlistRequest struct {
	InvestorAddress string `json:"investor_address" binding:"required"`
}

// AllowlistInvestor uses platform owner private key to KYC/allowlist an investor wallet in FinancingVault.
func AllowlistInvestor(vaultAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req AllowlistRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
			return
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
		nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch nonce: " + err.Error()})
			return
		}

		gasPrice, err := client.SuggestGasPrice(context.Background())
		if err != nil {
			gasPrice = big.NewInt(2000000000) // 2 Gwei fallback
		}

		// Minimal ABI for updateAllowlist(address,bool)
		parsedABI, err := abi.JSON(strings.NewReader(`[{"inputs":[{"internalType":"address","name":"investor","type":"address"},{"internalType":"bool","name":"isAllowed","type":"bool"}],"name":"updateAllowlist","outputs":[],"stateMutability":"nonpayable","type":"function"}]`))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ABI parsing error: " + err.Error()})
			return
		}

		investorAddr := common.HexToAddress(req.InvestorAddress)
		data, err := parsedABI.Pack("updateAllowlist", investorAddr, true)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Packing call failed: " + err.Error()})
			return
		}

		toAddr := common.HexToAddress(vaultAddress)
		gasLimit := uint64(100000)

		tx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &toAddr,
			Value:    big.NewInt(0),
			Gas:      gasLimit,
			GasPrice: gasPrice,
			Data:     data,
		})

		chainID := big.NewInt(1874)
		signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign tx: " + err.Error()})
			return
		}

		err = client.SendTransaction(context.Background(), signedTx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to broadcast allowlist tx: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"message":  "Investor wallet KYC approved and allowlisted on Whitechain Testnet.",
			"tx_hash":  signedTx.Hash().Hex(),
			"investor": req.InvestorAddress,
		})
	}
}
