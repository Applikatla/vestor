// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../access/AccessController.sol";
import "../tokens/InventoryToken.sol";

/**
 * @title RedemptionManager
 * @notice Solvency-guarded redemption manager executing atomic burn-and-pay or queued settlement
 */
contract RedemptionManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct RedemptionRequest {
        uint256 requestId;
        address investor;
        uint256 tokenAmount;
        uint256 payoutDue;
        bool isSettled;
        bool isCancelled;
    }

    AccessController public immutable accessController;
    InventoryToken public immutable inventoryToken;
    IERC20 public immutable paymentToken;

    // Price ratio: payoutAmount = (tokenAmount * redemptionPricePerToken) / 1e18
    uint256 public redemptionPricePerToken;
    bool public isRedemptionOpen;

    uint256 public nextRequestId = 1;
    uint256 public queueHead = 1;
    
    // requestId => RedemptionRequest
    mapping(uint256 => RedemptionRequest) public requests;

    event RedemptionExecuted(address indexed investor, uint256 tokenAmount, uint256 payoutAmount);
    event RedemptionQueued(uint256 indexed requestId, address indexed investor, uint256 tokenAmount, uint256 payoutDue);
    event QueuedRedemptionSettled(uint256 indexed requestId, address indexed investor, uint256 payoutAmount);
    event RedemptionPriceUpdated(uint256 newPrice);
    event RedemptionStateToggled(bool isOpen);

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "RedemptionManager: unauthorized caller");
        _;
    }

    modifier whenNotPaused() {
        require(!accessController.paused(), "RedemptionManager: paused");
        _;
    }

    constructor(
        address _accessController,
        address _inventoryToken,
        address _paymentToken,
        uint256 _initialRedemptionPrice
    ) {
        require(_accessController != address(0), "Invalid access controller");
        require(_inventoryToken != address(0), "Invalid inventory token");
        require(_paymentToken != address(0), "Invalid payment token");
        require(_initialRedemptionPrice > 0, "Initial price must be > 0");

        accessController = AccessController(_accessController);
        inventoryToken = InventoryToken(_inventoryToken);
        paymentToken = IERC20(_paymentToken);
        redemptionPricePerToken = _initialRedemptionPrice;
        isRedemptionOpen = true;
    }

    function setRedemptionPrice(uint256 newPrice) external onlyRole(accessController.TREASURY_ROLE()) {
        require(newPrice > 0, "Price must be > 0");
        redemptionPricePerToken = newPrice;
        emit RedemptionPriceUpdated(newPrice);
    }

    function setRedemptionOpen(bool open) external onlyRole(accessController.TREASURY_ROLE()) {
        isRedemptionOpen = open;
        emit RedemptionStateToggled(open);
    }

    /**
     * @notice Redeems tokens. Executes immediate burn-and-pay if liquid, else queues request.
     */
    function requestRedemption(uint256 tokenAmount) external nonReentrant whenNotPaused {
        require(isRedemptionOpen, "Redemption window is closed");
        require(tokenAmount > 0, "Token amount must be > 0");
        require(inventoryToken.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");

        uint256 payoutDue = (tokenAmount * redemptionPricePerToken) / 1e18;
        require(payoutDue > 0, "Payout amount too small");

        uint256 availableLiquidity = paymentToken.balanceOf(address(this));

        // Atomic burn-and-pay if queue is empty and sufficient liquid funds exist
        if (queueHead == nextRequestId && availableLiquidity >= payoutDue) {
            inventoryToken.burn(msg.sender, tokenAmount);
            paymentToken.safeTransfer(msg.sender, payoutDue);
            emit RedemptionExecuted(msg.sender, tokenAmount, payoutDue);
        } else {
            // Queue request: Pull tokens into custody to lock them
            inventoryToken.transferFrom(msg.sender, address(this), tokenAmount);

            uint256 reqId = nextRequestId++;
            requests[reqId] = RedemptionRequest({
                requestId: reqId,
                investor: msg.sender,
                tokenAmount: tokenAmount,
                payoutDue: payoutDue,
                isSettled: false,
                isCancelled: false
            });

            emit RedemptionQueued(reqId, msg.sender, tokenAmount, payoutDue);
        }
    }

    /**
     * @notice Processes FIFO queued redemption requests as liquidity becomes available
     */
    function processQueue(uint256 maxCount) external nonReentrant whenNotPaused {
        uint256 processed = 0;
        while (queueHead < nextRequestId && processed < maxCount) {
            RedemptionRequest storage req = requests[queueHead];
            
            if (req.isCancelled) {
                queueHead++;
                processed++;
                continue;
            }

            uint256 availableLiquidity = paymentToken.balanceOf(address(this));
            if (availableLiquidity < req.payoutDue) {
                // Not enough funds to settle next request in line
                break;
            }

            req.isSettled = true;
            queueHead++;
            processed++;

            // Burn the locked tokens held in custody
            inventoryToken.burn(address(this), req.tokenAmount);
            paymentToken.safeTransfer(req.investor, req.payoutDue);

            emit QueuedRedemptionSettled(req.requestId, req.investor, req.payoutDue);
        }
    }
}
