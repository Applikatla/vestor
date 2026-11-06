// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../access/AccessController.sol";

/**
 * @title DistributionManager
 * @notice Pull-based dividend/waterfall distribution manager utilizing Merkle root commitments from block snapshots
 */
contract DistributionManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct DistributionPool {
        uint256 distributionId;
        address paymentToken;
        uint256 totalAmount;
        uint256 claimedAmount;
        bytes32 merkleRoot;
        uint64 snapshotBlock;
        bytes32 termsHash;
        bool isActive;
    }

    AccessController public immutable accessController;

    uint256 public distributionCount;
    // distributionId => DistributionPool
    mapping(uint256 => DistributionPool) public pools;
    // distributionId => investor => claimed status
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event DistributionCreated(
        uint256 indexed distributionId,
        address indexed paymentToken,
        uint256 totalAmount,
        bytes32 merkleRoot,
        uint64 snapshotBlock
    );
    event DistributionClaimed(
        uint256 indexed distributionId,
        address indexed investor,
        uint256 amount
    );
    event DistributionClosed(uint256 indexed distributionId);

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "DistributionManager: unauthorized caller");
        _;
    }

    modifier whenNotPaused() {
        require(!accessController.paused(), "DistributionManager: paused");
        _;
    }

    constructor(address _accessController) {
        require(_accessController != address(0), "Invalid access controller");
        accessController = AccessController(_accessController);
    }

    /**
     * @notice Creates a new distribution pool backed by funded payment tokens
     */
    function createDistribution(
        address paymentToken,
        uint256 totalAmount,
        bytes32 merkleRoot,
        uint64 snapshotBlock,
        bytes32 termsHash
    ) external onlyRole(accessController.TREASURY_ROLE()) nonReentrant whenNotPaused returns (uint256) {
        require(paymentToken != address(0), "Invalid payment token");
        require(totalAmount > 0, "Distribution amount must be > 0");
        require(merkleRoot != bytes32(0), "Invalid merkle root");

        distributionCount++;
        uint256 id = distributionCount;

        pools[id] = DistributionPool({
            distributionId: id,
            paymentToken: paymentToken,
            totalAmount: totalAmount,
            claimedAmount: 0,
            merkleRoot: merkleRoot,
            snapshotBlock: snapshotBlock,
            termsHash: termsHash,
            isActive: true
        });

        // Pull distribution funds into this contract
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), totalAmount);

        emit DistributionCreated(id, paymentToken, totalAmount, merkleRoot, snapshotBlock);

        return id;
    }

    /**
     * @notice Allows token holders to claim their share using a snapshot Merkle proof
     */
    function claim(
        uint256 distributionId,
        uint256 entitlement,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused {
        DistributionPool storage pool = pools[distributionId];
        require(pool.isActive, "Distribution pool is not active");
        require(!hasClaimed[distributionId][msg.sender], "Distribution already claimed");

        // Verify Merkle Proof: leaf is hash of (address, entitlement)
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, entitlement))));
        require(MerkleProof.verify(merkleProof, pool.merkleRoot, leaf), "Invalid claim proof");

        hasClaimed[distributionId][msg.sender] = true;
        pool.claimedAmount += entitlement;
        require(pool.claimedAmount <= pool.totalAmount, "Pool cannot exceed total amount");

        IERC20(pool.paymentToken).safeTransfer(msg.sender, entitlement);

        emit DistributionClaimed(distributionId, msg.sender, entitlement);
    }

    /**
     * @notice Closes a pool and refunds unclaimed balances after validity period
     */
    function closeDistribution(uint256 distributionId, address refundRecipient) external onlyRole(accessController.TREASURY_ROLE()) nonReentrant {
        DistributionPool storage pool = pools[distributionId];
        require(pool.isActive, "Pool already closed");
        require(refundRecipient != address(0), "Invalid recipient");

        pool.isActive = false;
        uint256 remaining = pool.totalAmount - pool.claimedAmount;

        if (remaining > 0) {
            IERC20(pool.paymentToken).safeTransfer(refundRecipient, remaining);
        }

        emit DistributionClosed(distributionId);
    }
}
