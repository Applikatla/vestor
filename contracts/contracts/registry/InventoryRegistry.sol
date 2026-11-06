// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../access/AccessController.sol";

/**
 * @title InventoryRegistry
 * @notice Immutable registration authority for inventory commitments and hashed evidence
 */
contract InventoryRegistry {
    enum InventoryStatus {
        NONE,
        REGISTERED,
        ACTIVE,
        LOCKED_FOR_FINANCING,
        LIQUIDATING,
        CLOSED,
        DISPUTED
    }

    struct InventoryRecord {
        bytes32 inventoryId;
        address issuer;
        bytes32 evidenceRoot;
        uint64 registeredAt;
        InventoryStatus status;
    }

    AccessController public immutable accessController;

    // inventoryId => InventoryRecord
    mapping(bytes32 => InventoryRecord) public inventories;
    
    // inventoryId => append-only history of evidence roots
    mapping(bytes32 => bytes32[]) private _evidenceHistory;

    event InventoryRegistered(
        bytes32 indexed inventoryId,
        address indexed issuer,
        bytes32 evidenceRoot,
        uint64 registeredAt
    );
    event EvidenceAdded(
        bytes32 indexed inventoryId,
        bytes32 newEvidenceRoot,
        uint64 timestamp
    );
    event InventoryStatusChanged(
        bytes32 indexed inventoryId,
        InventoryStatus previousStatus,
        InventoryStatus newStatus
    );

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "InventoryRegistry: caller unauthorized");
        _;
    }

    modifier whenNotPaused() {
        require(!accessController.paused(), "InventoryRegistry: paused");
        _;
    }

    constructor(address accessControllerAddress) {
        require(accessControllerAddress != address(0), "Invalid access controller");
        accessController = AccessController(accessControllerAddress);
    }

    /**
     * @notice Registers a new inventory commitment on-chain
     * @param inventoryId Deterministic unique identifier
     * @param issuer Address of the company/issuer owning the stock
     * @param evidenceRoot Cryptographic digest (SHA-256 / Merkle root) of verified documents
     */
    function registerInventory(
        bytes32 inventoryId,
        address issuer,
        bytes32 evidenceRoot
    ) external whenNotPaused onlyRole(accessController.REGISTRAR_ROLE()) {
        require(inventoryId != bytes32(0), "Invalid inventory ID");
        require(issuer != address(0), "Invalid issuer");
        require(evidenceRoot != bytes32(0), "Invalid evidence root");
        require(inventories[inventoryId].status == InventoryStatus.NONE, "Inventory already registered");

        uint64 timestamp = uint64(block.timestamp);
        inventories[inventoryId] = InventoryRecord({
            inventoryId: inventoryId,
            issuer: issuer,
            evidenceRoot: evidenceRoot,
            registeredAt: timestamp,
            status: InventoryStatus.REGISTERED
        });

        _evidenceHistory[inventoryId].push(evidenceRoot);

        emit InventoryRegistered(inventoryId, issuer, evidenceRoot, timestamp);
    }

    /**
     * @notice Appends an updated evidence commitment (e.g. fresh warehouse inspection, lien check)
     */
    function addEvidenceCommitment(
        bytes32 inventoryId,
        bytes32 newEvidenceRoot
    ) external whenNotPaused onlyRole(accessController.VERIFIER_ROLE()) {
        require(inventories[inventoryId].status != InventoryStatus.NONE, "Inventory not registered");
        require(newEvidenceRoot != bytes32(0), "Invalid evidence root");

        _evidenceHistory[inventoryId].push(newEvidenceRoot);
        inventories[inventoryId].evidenceRoot = newEvidenceRoot;

        emit EvidenceAdded(inventoryId, newEvidenceRoot, uint64(block.timestamp));
    }

    /**
     * @notice Updates the operational status of an inventory record
     */
    function updateStatus(
        bytes32 inventoryId,
        InventoryStatus newStatus
    ) external whenNotPaused {
        require(
            accessController.hasRole(accessController.REGISTRAR_ROLE(), msg.sender) ||
            accessController.hasRole(accessController.TREASURY_ROLE(), msg.sender),
            "InventoryRegistry: caller unauthorized for status change"
        );
        require(inventories[inventoryId].status != InventoryStatus.NONE, "Inventory not registered");
        require(newStatus != InventoryStatus.NONE, "Invalid status");

        InventoryStatus previous = inventories[inventoryId].status;
        inventories[inventoryId].status = newStatus;

        emit InventoryStatusChanged(inventoryId, previous, newStatus);
    }

    function getEvidenceHistory(bytes32 inventoryId) external view returns (bytes32[] memory) {
        return _evidenceHistory[inventoryId];
    }
}
