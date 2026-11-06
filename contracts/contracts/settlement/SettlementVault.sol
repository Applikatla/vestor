// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../access/AccessController.sol";

/**
 * @title SettlementVault
 * @notice Holds realized sale proceeds and enforces strict segregation across reserves
 */
contract SettlementVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    AccessController public immutable accessController;
    IERC20 public immutable paymentToken;

    uint256 public principalReserve;
    uint256 public distributionReserve;
    uint256 public operatingReserve;

    event ProceedsDeposited(address indexed from, uint256 amount);
    event ReservesAllocated(uint256 principal, uint256 distribution, uint256 operating);
    event FundsDisbursed(address indexed destination, uint256 amount, string purpose);

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "SettlementVault: unauthorized caller");
        _;
    }

    modifier whenNotPaused() {
        require(!accessController.paused(), "SettlementVault: paused");
        _;
    }

    constructor(address _accessController, address _paymentToken) {
        require(_accessController != address(0), "Invalid access controller");
        require(_paymentToken != address(0), "Invalid payment token");

        accessController = AccessController(_accessController);
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Receives customer sale proceeds
     */
    function depositProceeds(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Deposit must be > 0");
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit ProceedsDeposited(msg.sender, amount);
    }

    /**
     * @notice Allocates unreserved vault cash into strict reserve buckets per waterfall policy
     */
    function allocateReserves(
        uint256 toPrincipal,
        uint256 toDistribution,
        uint256 toOperating
    ) external onlyRole(accessController.TREASURY_ROLE()) {
        uint256 totalBalance = paymentToken.balanceOf(address(this));
        uint256 currentlyReserved = principalReserve + distributionReserve + operatingReserve;
        uint256 unreserved = totalBalance > currentlyReserved ? totalBalance - currentlyReserved : 0;

        require(toPrincipal + toDistribution + toOperating <= unreserved, "Allocation exceeds unreserved balance");

        principalReserve += toPrincipal;
        distributionReserve += toDistribution;
        operatingReserve += toOperating;

        emit ReservesAllocated(principalReserve, distributionReserve, operatingReserve);
    }

    /**
     * @notice Disburses funds from a specific reserve category
     */
    function disburse(
        address destination,
        uint256 amount,
        uint8 reserveCategory, // 1: Principal, 2: Distribution, 3: Operating
        string calldata purpose
    ) external onlyRole(accessController.TREASURY_ROLE()) nonReentrant whenNotPaused {
        require(destination != address(0), "Invalid destination");

        if (reserveCategory == 1) {
            require(principalReserve >= amount, "Insufficient principal reserve");
            principalReserve -= amount;
        } else if (reserveCategory == 2) {
            require(distributionReserve >= amount, "Insufficient distribution reserve");
            distributionReserve -= amount;
        } else if (reserveCategory == 3) {
            require(operatingReserve >= amount, "Insufficient operating reserve");
            operatingReserve -= amount;
        } else {
            revert("Invalid reserve category");
        }

        paymentToken.safeTransfer(destination, amount);
        emit FundsDisbursed(destination, amount, purpose);
    }
}
