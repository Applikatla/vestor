// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../access/AccessController.sol";
import "../tokens/InventoryToken.sol";

/**
 * @title FinancingVault
 * @notice Custodies investor stablecoins and atomically mints/allocates InventoryTokens
 */
contract FinancingVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum VaultState {
        OPEN,
        FUNDED,
        FAILED,
        CLOSED
    }

    AccessController public immutable accessController;
    IERC20 public immutable paymentToken; // e.g. USDC
    InventoryToken public immutable inventoryToken;

    address public issuer;
    uint256 public immutable targetCapital;
    uint256 public immutable minCapital;
    uint256 public immutable subscriptionDeadline;
    
    // Price ratio: tokenAmount = (paymentAmount * 10^18) / pricePerToken
    // e.g. If pricePerToken = $100 * 10^6 (for 6 decimal USDC), 1 token unit costs $100 USDC.
    uint256 public immutable pricePerToken; 

    uint256 public totalRaised;
    uint256 public totalReleasedToIssuer;
    VaultState public state;

    // investor => amount of payment token deposited
    mapping(address => uint256) public deposits;
    // investor => token units allocated
    mapping(address => uint256) public tokenAllocations;
    // investor => boolean refund claimed
    mapping(address => bool) public refundClaimed;

    event Subscribed(address indexed investor, uint256 paymentAmount, uint256 tokenAmount);
    event OfferFunded(uint256 totalRaisedTimestamp);
    event OfferFailed(uint256 totalRaised, uint256 minCapital);
    event FundsReleased(address indexed recipient, uint256 amount);
    event RefundClaimed(address indexed investor, uint256 amount);
    event VaultClosed();

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "Vault: unauthorized caller");
        _;
    }

    modifier whenNotPaused() {
        require(!accessController.paused(), "Vault: system paused");
        _;
    }

    constructor(
        address _accessController,
        address _paymentToken,
        address _inventoryToken,
        address _issuer,
        uint256 _targetCapital,
        uint256 _minCapital,
        uint256 _pricePerToken,
        uint256 _subscriptionDurationSeconds
    ) {
        require(_accessController != address(0), "Invalid access controller");
        require(_paymentToken != address(0), "Invalid payment token");
        require(_inventoryToken != address(0), "Invalid inventory token");
        require(_issuer != address(0), "Invalid issuer");
        require(_targetCapital >= _minCapital, "Target must be >= min");
        require(_pricePerToken > 0, "Price must be > 0");

        accessController = AccessController(_accessController);
        paymentToken = IERC20(_paymentToken);
        inventoryToken = InventoryToken(_inventoryToken);
        issuer = _issuer;
        targetCapital = _targetCapital;
        minCapital = _minCapital;
        pricePerToken = _pricePerToken;
        subscriptionDeadline = block.timestamp + _subscriptionDurationSeconds;
        state = VaultState.OPEN;
    }

    /**
     * @notice Subscribes funds to the financing offer. Transfers stablecoin in and mints tokens atomically.
     */
    function subscribe(uint256 paymentAmount) external nonReentrant whenNotPaused {
        _checkAndUpdateState();
        require(state == VaultState.OPEN, "Offer is not open for subscription");
        require(paymentAmount > 0, "Payment amount must be > 0");
        require(totalRaised + paymentAmount <= targetCapital, "Exceeds target capital");

        // Calculate token units to mint (assuming 18 decimal inventory token)
        // tokenAmount = (paymentAmount * 1e18) / pricePerToken
        uint256 tokenAmount = (paymentAmount * 1e18) / pricePerToken;
        require(tokenAmount > 0, "Token amount too small");

        deposits[msg.sender] += paymentAmount;
        tokenAllocations[msg.sender] += tokenAmount;
        totalRaised += paymentAmount;

        // Atomic swap: Pull payment token in
        paymentToken.safeTransferFrom(msg.sender, address(this), paymentAmount);

        // Mint inventory tokens to investor
        inventoryToken.mint(msg.sender, tokenAmount);

        emit Subscribed(msg.sender, paymentAmount, tokenAmount);

        if (totalRaised == targetCapital) {
            state = VaultState.FUNDED;
            emit OfferFunded(block.timestamp);
        }
    }

    /**
     * @notice Checks status and finalizes state if deadline is reached
     */
    function checkFinalize() external {
        _checkAndUpdateState();
    }

    function _checkAndUpdateState() internal {
        if (state == VaultState.OPEN && block.timestamp >= subscriptionDeadline) {
            if (totalRaised >= minCapital) {
                state = VaultState.FUNDED;
                emit OfferFunded(block.timestamp);
            } else {
                state = VaultState.FAILED;
                emit OfferFailed(totalRaised, minCapital);
            }
        }
    }

    /**
     * @notice Releases raised funds to the issuer once the offer is FUNDED
     */
    function releaseToIssuer(uint256 amount) external nonReentrant whenNotPaused onlyRole(accessController.TREASURY_ROLE()) {
        _checkAndUpdateState();
        require(state == VaultState.FUNDED, "Offer is not funded");
        require(totalReleasedToIssuer + amount <= totalRaised, "Release amount exceeds raised capital");

        totalReleasedToIssuer += amount;
        paymentToken.safeTransfer(issuer, amount);

        emit FundsReleased(issuer, amount);
    }

    /**
     * @notice Allows subscribers to claim full refund if funding threshold was not met
     */
    function claimRefund() external nonReentrant {
        _checkAndUpdateState();
        require(state == VaultState.FAILED, "Refunds only allowed when offer fails");
        require(!refundClaimed[msg.sender], "Refund already claimed");

        uint256 depositAmount = deposits[msg.sender];
        require(depositAmount > 0, "No deposit found");

        refundClaimed[msg.sender] = true;

        // Burn the allocated inventory tokens if any were minted
        uint256 tokensMinted = tokenAllocations[msg.sender];
        if (tokensMinted > 0) {
            // Note: Vault must have BURNER_ROLE or burn from user
            inventoryToken.burn(msg.sender, tokensMinted);
        }

        paymentToken.safeTransfer(msg.sender, depositAmount);

        emit RefundClaimed(msg.sender, depositAmount);
    }

    /**
     * @notice Admin function to mark vault closed once lifecycle terminates
     */
    function closeVault() external onlyRole(accessController.TREASURY_ROLE()) {
        state = VaultState.CLOSED;
        emit VaultClosed();
    }
}
