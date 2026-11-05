// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IInventoryRegistry.sol";
import "./InventoryERC20.sol";

/**
 * @title FinancingVault (Global Master Vault)
 * @notice Global Singleton Vault managing multiple inventory financing issuances.
 *         Deployed ONCE. Handles investor onboarding, capital aggregation,
 *         drawdowns, repayments, and redemptions across all tokenized inventories.
 */
contract FinancingVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Custom Errors
    error IssuanceAlreadyExists(bytes32 inventoryId);
    error IssuanceDoesNotExist(bytes32 inventoryId);
    error NotAllowlisted(address investor);
    error InvalidState(IssuanceState current, IssuanceState expected);
    error TargetExceeded(uint256 requested, uint256 remaining);
    error DeadlinePassed();
    error DeadlineNotPassed();
    error TargetNotMet();
    error ZeroAmount();
    error InsufficientTokens();
    error InventoryNotApproved();
    error Unauthorized();

    enum IssuanceState {
        SubscriptionOpen,
        FundingTargetReached,
        FundsDisbursed,
        ActiveMonitoring,
        FullySettled,
        Failed
    }

    struct Issuance {
        bytes32 inventoryId;
        address issuer;
        address inventoryToken;           // Specific InventoryERC20 for this batch
        uint256 targetCapital;            // Stablecoin funding target
        uint256 tokenPrice;               // Stablecoin units per 1e18 InventoryToken
        uint256 advanceRateBps;           // Basis points (e.g., 8000 = 80%)
        uint256 subscriptionDeadline;     // Unix timestamp
        IssuanceState state;
        uint256 totalFunded;
        uint256 totalDisbursed;
        uint256 totalRepaidSettlement;
        uint256 totalRedeemedTokens;
        bool exists;
    }

    // Platform State Variables
    IInventoryRegistry public immutable registry;
    IERC20 public immutable paymentToken; // Primary stablecoin (e.g. USDC)

    // Storage: inventoryId => Issuance
    mapping(bytes32 => Issuance) public issuances;
    bytes32[] public allInventoryIds;

    // Global Investor Allowlist (KYC/KYB verified on platform)
    mapping(address => bool) public allowlist;

    // Accounting: inventoryId => investor => deposited stablecoins
    mapping(bytes32 => mapping(address => uint256)) public investorDeposits;
    // Accounting: inventoryId => investor => redeemed stablecoins
    mapping(bytes32 => mapping(address => uint256)) public investorRedeemedProceeds;

    // Events
    event IssuanceCreated(
        bytes32 indexed inventoryId,
        address indexed issuer,
        address indexed inventoryToken,
        uint256 targetCapital,
        uint256 tokenPrice,
        uint256 advanceRateBps,
        uint256 deadline
    );
    event InvestorAllowlistUpdated(address indexed investor, bool status);
    event InvestmentDeposited(
        bytes32 indexed inventoryId,
        address indexed investor,
        uint256 stablecoinAmount,
        uint256 tokensMinted
    );
    event FundingTargetReached(bytes32 indexed inventoryId, uint256 totalFunded);
    event FundsDisbursedToIssuer(bytes32 indexed inventoryId, address indexed issuer, uint256 advanceAmount);
    event SettlementDeposited(bytes32 indexed inventoryId, address indexed depositor, uint256 amount);
    event TokensRedeemed(
        bytes32 indexed inventoryId,
        address indexed investor,
        uint256 tokenAmount,
        uint256 stablecoinPayout
    );
    event IssuanceRefunded(bytes32 indexed inventoryId, address indexed investor, uint256 amount);
    event IssuanceClosed(bytes32 indexed inventoryId, string finalReportUri);

    constructor(
        address _registry,
        address _paymentToken
    ) Ownable(msg.sender) {
        require(_registry != address(0) && _paymentToken != address(0), "Invalid address");
        registry = IInventoryRegistry(_registry);
        paymentToken = IERC20(_paymentToken);
    }

    // ==========================================
    // 1. ADMIN & ISSUANCE INITIALIZATION
    // ==========================================

    function createIssuance(
        bytes32 inventoryId,
        address issuer,
        address inventoryToken,
        uint256 targetCapital,
        uint256 tokenPrice,
        uint256 advanceRateBps,
        uint256 subscriptionDurationSeconds
    ) external onlyOwner {
        if (issuances[inventoryId].exists) {
            revert IssuanceAlreadyExists(inventoryId);
        }
        if (!registry.isInventoryApproved(inventoryId)) {
            revert InventoryNotApproved();
        }
        if (issuer == address(0) || inventoryToken == address(0)) {
            revert ZeroAmount();
        }

        uint256 deadline = block.timestamp + subscriptionDurationSeconds;

        issuances[inventoryId] = Issuance({
            inventoryId: inventoryId,
            issuer: issuer,
            inventoryToken: inventoryToken,
            targetCapital: targetCapital,
            tokenPrice: tokenPrice,
            advanceRateBps: advanceRateBps,
            subscriptionDeadline: deadline,
            state: IssuanceState.SubscriptionOpen,
            totalFunded: 0,
            totalDisbursed: 0,
            totalRepaidSettlement: 0,
            totalRedeemedTokens: 0,
            exists: true
        });

        allInventoryIds.push(inventoryId);

        emit IssuanceCreated(
            inventoryId,
            issuer,
            inventoryToken,
            targetCapital,
            tokenPrice,
            advanceRateBps,
            deadline
        );
    }

    function updateAllowlist(address investor, bool isAllowed) external onlyOwner {
        allowlist[investor] = isAllowed;
        emit InvestorAllowlistUpdated(investor, isAllowed);
    }

    function updateAllowlistBatch(address[] calldata investors, bool isAllowed) external onlyOwner {
        for (uint256 i = 0; i < investors.length; i++) {
            allowlist[investors[i]] = isAllowed;
            emit InvestorAllowlistUpdated(investors[i], isAllowed);
        }
    }

    // ==========================================
    // 2. INVESTOR SUBSCRIPTION (CAPITAL FORMATION)
    // ==========================================

    function deposit(bytes32 inventoryId, uint256 stablecoinAmount) external nonReentrant {
        Issuance storage item = issuances[inventoryId];
        if (!item.exists) revert IssuanceDoesNotExist(inventoryId);
        if (item.state != IssuanceState.SubscriptionOpen) {
            revert InvalidState(item.state, IssuanceState.SubscriptionOpen);
        }
        if (block.timestamp > item.subscriptionDeadline) {
            revert DeadlinePassed();
        }
        if (!allowlist[msg.sender]) {
            revert NotAllowlisted(msg.sender);
        }
        if (stablecoinAmount == 0) {
            revert ZeroAmount();
        }
        if (item.totalFunded + stablecoinAmount > item.targetCapital) {
            revert TargetExceeded(stablecoinAmount, item.targetCapital - item.totalFunded);
        }

        item.totalFunded += stablecoinAmount;
        investorDeposits[inventoryId][msg.sender] += stablecoinAmount;

        paymentToken.safeTransferFrom(msg.sender, address(this), stablecoinAmount);

        uint256 tokensToMint = (stablecoinAmount * 1e18) / item.tokenPrice;
        InventoryERC20(item.inventoryToken).mint(msg.sender, tokensToMint);

        emit InvestmentDeposited(inventoryId, msg.sender, stablecoinAmount, tokensToMint);

        if (item.totalFunded == item.targetCapital) {
            item.state = IssuanceState.FundingTargetReached;
            emit FundingTargetReached(inventoryId, item.totalFunded);
        }
    }

    // ==========================================
    // 3. DRAWDOWN (DISBURSAL TO ISSUER)
    // ==========================================

    function releaseApprovedFundsToIssuer(bytes32 inventoryId) external nonReentrant {
        Issuance storage item = issuances[inventoryId];
        if (!item.exists) revert IssuanceDoesNotExist(inventoryId);
        if (msg.sender != owner() && msg.sender != item.issuer) revert Unauthorized();
        if (item.state != IssuanceState.FundingTargetReached && (item.state != IssuanceState.SubscriptionOpen || item.totalFunded < item.targetCapital)) {
            revert TargetNotMet();
        }

        uint256 advanceAmount = (item.totalFunded * item.advanceRateBps) / 10000;
        item.totalDisbursed = advanceAmount;
        item.state = IssuanceState.ActiveMonitoring;

        registry.markFinanced(inventoryId, address(this));

        paymentToken.safeTransfer(item.issuer, advanceAmount);

        emit FundsDisbursedToIssuer(inventoryId, item.issuer, advanceAmount);
    }

    // ==========================================
    // 4. REFUND (INVESTOR PROTECTION)
    // ==========================================

    function refund(bytes32 inventoryId) external nonReentrant {
        Issuance storage item = issuances[inventoryId];
        if (!item.exists) revert IssuanceDoesNotExist(inventoryId);
        if (block.timestamp <= item.subscriptionDeadline && item.totalFunded < item.targetCapital) {
            revert DeadlineNotPassed();
        }
        if (item.state == IssuanceState.FundsDisbursed || item.state == IssuanceState.ActiveMonitoring || item.state == IssuanceState.FullySettled) {
            revert InvalidState(item.state, IssuanceState.Failed);
        }

        item.state = IssuanceState.Failed;
        uint256 depositAmt = investorDeposits[inventoryId][msg.sender];
        if (depositAmt == 0) revert ZeroAmount();

        investorDeposits[inventoryId][msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, depositAmt);

        emit IssuanceRefunded(inventoryId, msg.sender, depositAmt);
    }

    // ==========================================
    // 5. SETTLEMENT & REDEMPTION
    // ==========================================

    function depositSettlement(bytes32 inventoryId, uint256 amount) external nonReentrant {
        Issuance storage item = issuances[inventoryId];
        if (!item.exists) revert IssuanceDoesNotExist(inventoryId);
        if (item.state != IssuanceState.ActiveMonitoring) {
            revert InvalidState(item.state, IssuanceState.ActiveMonitoring);
        }
        if (amount == 0) revert ZeroAmount();

        item.totalRepaidSettlement += amount;
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        emit SettlementDeposited(inventoryId, msg.sender, amount);
    }

    function redeemSettlement(bytes32 inventoryId, uint256 tokenAmount) external nonReentrant {
        Issuance storage item = issuances[inventoryId];
        if (!item.exists) revert IssuanceDoesNotExist(inventoryId);
        if (tokenAmount == 0) revert ZeroAmount();

        InventoryERC20 token = InventoryERC20(item.inventoryToken);
        if (token.balanceOf(msg.sender) < tokenAmount) revert InsufficientTokens();

        uint256 stablecoinPayout = (tokenAmount * item.tokenPrice) / 1e18;

        item.totalRedeemedTokens += tokenAmount;
        investorRedeemedProceeds[inventoryId][msg.sender] += stablecoinPayout;

        token.burn(msg.sender, tokenAmount);

        paymentToken.safeTransfer(msg.sender, stablecoinPayout);

        emit TokensRedeemed(inventoryId, msg.sender, tokenAmount, stablecoinPayout);
    }

    // ==========================================
    // 6. LIFECYCLE COMPLETION
    // ==========================================

    function closeIssuance(bytes32 inventoryId, string calldata finalReportUri) external onlyOwner {
        Issuance storage item = issuances[inventoryId];
        if (!item.exists) revert IssuanceDoesNotExist(inventoryId);
        if (item.state != IssuanceState.ActiveMonitoring) {
            revert InvalidState(item.state, IssuanceState.ActiveMonitoring);
        }

        item.state = IssuanceState.FullySettled;
        registry.closeInventory(inventoryId, finalReportUri);

        emit IssuanceClosed(inventoryId, finalReportUri);
    }

    // ==========================================
    // 7. VIEW HELPERS
    // ==========================================

    function getIssuance(bytes32 inventoryId) external view returns (Issuance memory) {
        return issuances[inventoryId];
    }

    function totalIssuances() external view returns (uint256) {
        return allInventoryIds.length;
    }
}
