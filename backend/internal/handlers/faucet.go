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

type FaucetRequest struct {
	Address string `json:"address" binding:"required"`
}

// FaucetClaims handles gasless minting of MockUSDC and provides testnet WBT gas to new wallets
func ClaimFaucet(usdcAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req FaucetRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
			return
		}

		if !common.IsHexAddress(req.Address) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid EVM recipient address"})
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
		targetAddress := common.HexToAddress(req.Address)

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

		var gasTxHash string

		// 1. If recipient has less than 0.05 WBT, drip 0.05 WBT gas from deployer
		targetBal, err := client.BalanceAt(context.Background(), targetAddress, nil)
		if err == nil {
			minGas := big.NewInt(50000000000000000) // 0.05 WBT
			if targetBal.Cmp(minGas) < 0 {
				gasTransfer := big.NewInt(50000000000000000) // 0.05 WBT
				gasLimit := uint64(21000)
				tx := types.NewTx(&types.LegacyTx{
					Nonce:    nonce,
					To:       &targetAddress,
					Value:    gasTransfer,
					Gas:      gasLimit,
					GasPrice: gasPrice,
					Data:     nil,
				})
				signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
				if err == nil {
					if err := client.SendTransaction(context.Background(), signedTx); err == nil {
						gasTxHash = signedTx.Hash().Hex()
						nonce++
					}
				}
			}
		}

		// 2. Mint 10,000 Mock USDC (10,000 * 10^6)
		parsedABI, err := abi.JSON(strings.NewReader(`[{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"}]`))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ABI parse error: " + err.Error()})
			return
		}

		mintAmount := big.NewInt(10000000000) // 10,000 USDC with 6 decimals
		data, err := parsedABI.Pack("mint", targetAddress, mintAmount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ABI pack error: " + err.Error()})
			return
		}

		usdcAddr := common.HexToAddress(usdcAddress)
		gasLimit := uint64(100000)
		tx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &usdcAddr,
			Value:    big.NewInt(0),
			Gas:      gasLimit,
			GasPrice: gasPrice,
			Data:     data,
		})

		signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign USDC mint tx: " + err.Error()})
			return
		}

		if err := client.SendTransaction(context.Background(), signedTx); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send USDC mint tx: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"message":     "Successfully minted 10,000 Mock USDC to wallet!",
			"usdc_tx":     signedTx.Hash().Hex(),
			"gas_drip_tx": gasTxHash,
		})
	}
}
