require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Normalize private key with 0x prefix if provided
const privateKey = process.env.PRIVATE_KEY
  ? (process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`)
  : undefined;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    whitechainTestnet: {
      url: process.env.WHITECHAIN_TESTNET_RPC || "https://rpc.ankr.com/whitechain_testnet",
      chainId: 1874,
      accounts: privateKey ? [privateKey] : [],
    },
    whitechainTestnetBackup: {
      url: process.env.WHITECHAIN_TESTNET_BACKUP_RPC || "https://rpc.testnet.whitechain.io",
      chainId: 1874,
      accounts: privateKey ? [privateKey] : [],
    },
  },
};
