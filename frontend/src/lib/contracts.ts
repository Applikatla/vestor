export const WHITECHAIN_SEPOLIA_CONTRACTS = {
  chainId: 1874,
  networkName: "Whitechain Sepolia",
  rpcUrl: "https://rpc.testnet.whitechain.io",
  explorerUrl: "https://explorer.testnet.whitechain.io",
  AccessController: "0xD22E553477bb586c19Eb50E5b215bCE66A65111B",
  InventoryRegistry: "0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D",
  InventoryTokenFactory: "0xEBC9D0006b1f35cB6BAFe18624A03f7fad6980Dc",
  SalesSettlement: "0x01ED64dCD39E76fb5e947f65165D9cA3454F483E",
  DistributionManager: "0xfd3Cb1A31f54b6DDCCa778fE6E15C346EF5d38F3",
  MockUSDC: "0x100F1843Bf91962349cE9C84F45ae6581Eb72B61",
};

// Default active contracts pointing directly to Whitechain Sepolia
export const ACTIVE_CONTRACTS = WHITECHAIN_SEPOLIA_CONTRACTS;
export const SEPOLIA_CONTRACTS = WHITECHAIN_SEPOLIA_CONTRACTS;

export const REGISTRY_ABI = [
  "function registerInventory(bytes32 inventoryId, address issuer, bytes32 evidenceRoot) external",
  "function inventories(bytes32) view returns (bytes32 inventoryId, address issuer, bytes32 evidenceRoot, uint64 registeredAt, uint8 status)",
  "function getEvidenceHistory(bytes32 inventoryId) view returns (bytes32[])",
  "event InventoryRegistered(bytes32 indexed inventoryId, address indexed issuer, bytes32 evidenceRoot, uint64 registeredAt)",
];

export const MOCK_USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export const TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, bytes32 inventoryId, bytes32 issuanceId, bytes32 termsHash, uint256 maxSupply) external returns (address)",
  "function tokens(bytes32) view returns (address)",
  "function totalTokens() view returns (uint256)",
];

export const INVENTORY_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function termsHash() view returns (bytes32)",
  "function isAllowlisted(address) view returns (bool)",
  "function setAllowlist(address account, bool status) external",
];

export const DISTRIBUTION_MANAGER_ABI = [
  "function createDistribution(address paymentToken, uint256 totalAmount, bytes32 merkleRoot, uint64 snapshotBlock, bytes32 termsHash) external returns (uint256)",
  "function claim(uint256 distributionId, uint256 entitlement, bytes32[] merkleProof) external",
  "function hasClaimed(uint256, address) view returns (bool)",
  "function distributionCount() view returns (uint256)",
];

export const SALES_SETTLEMENT_ABI = [
  "function recordSaleAttestation(bytes32 inventoryId, bytes32 batchId, bytes32 saleId, uint256 quantity, uint256 grossAmount, uint256 netAmount, bytes32 buyerRefHash, uint256 timestamp, uint256 nonce, bytes signature) external",
  "function processedSales(bytes32) view returns (bool)",
  "event SaleAttestationRecorded(bytes32 indexed inventoryId, bytes32 indexed batchId, bytes32 indexed saleId, uint256 quantity, uint256 grossAmount, uint256 netAmount)",
];
