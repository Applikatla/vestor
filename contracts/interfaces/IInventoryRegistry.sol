// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IInventoryRegistry
 * @dev Interface for the on-chain Inventory Registry in the RWA financing pipeline.
 */
interface IInventoryRegistry {
    enum InspectionStatus {
        Uninitialized,
        PendingInspection,
        Approved,
        Rejected,
        Financed,
        Closed
    }

    struct InventoryRecord {
        bytes32 inventoryId;
        address issuer;
        bytes32 canonicalRecordHash;
        uint256 submittedAt;
        uint256 valuation;
        InspectionStatus status;
        string inspectionEvidenceUri;
        address financingVault;
    }

    event InventoryRegistered(
        bytes32 indexed inventoryId,
        address indexed issuer,
        bytes32 canonicalRecordHash,
        uint256 submittedAt
    );

    event InventoryInspectionUpdated(
        bytes32 indexed inventoryId,
        uint256 valuation,
        InspectionStatus status,
        string evidenceUri,
        address indexed inspector
    );

    event InventoryFinanced(
        bytes32 indexed inventoryId,
        address indexed financingVault
    );

    event InventoryClosed(
        bytes32 indexed inventoryId,
        string settlementReportUri
    );

    function registerInventory(
        bytes32 inventoryId,
        bytes32 canonicalRecordHash,
        address issuer
    ) external;

    function updateValuationAndInspection(
        bytes32 inventoryId,
        uint256 valuation,
        InspectionStatus status,
        string calldata evidenceUri
    ) external;

    function markFinanced(bytes32 inventoryId, address vault) external;

    function closeInventory(bytes32 inventoryId, string calldata settlementReportUri) external;

    function getInventory(bytes32 inventoryId) external view returns (InventoryRecord memory);

    function isInventoryApproved(bytes32 inventoryId) external view returns (bool);
}

