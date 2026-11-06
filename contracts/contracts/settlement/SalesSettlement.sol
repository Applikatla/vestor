// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../access/AccessController.sol";

/**
 * @title SalesSettlement
 * @notice Validates and records off-chain attested inventory sales using EIP-712 structured signatures
 */
contract SalesSettlement is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant SALE_ATTESTATION_TYPEHASH = keccak256(
        "SaleAttestation(bytes32 inventoryId,bytes32 batchId,bytes32 saleId,uint256 quantity,uint256 grossAmount,uint256 netAmount,bytes32 buyerRefHash,uint256 timestamp,uint256 nonce)"
    );

    AccessController public immutable accessController;

    // saleId => settled status
    mapping(bytes32 => bool) public settledSales;
    // saleId => reversalId (if reversed)
    mapping(bytes32 => bytes32) public saleReversals;

    event SaleAttested(
        bytes32 indexed inventoryId,
        bytes32 indexed batchId,
        bytes32 indexed saleId,
        uint256 quantity,
        uint256 grossAmount,
        uint256 netAmount,
        address attestor
    );

    event SaleReversed(
        bytes32 indexed originalSaleId,
        bytes32 indexed reversalId,
        bytes32 reasonHash
    );

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "SalesSettlement: unauthorized caller");
        _;
    }

    modifier whenNotPaused() {
        require(!accessController.paused(), "SalesSettlement: paused");
        _;
    }

    constructor(
        address _accessController
    ) EIP712("InventorySalesSettlement", "1") {
        require(_accessController != address(0), "Invalid access controller");
        accessController = AccessController(_accessController);
    }

    /**
     * @notice Records a signed sale attestation on-chain
     */
    function recordSaleAttestation(
        bytes32 inventoryId,
        bytes32 batchId,
        bytes32 saleId,
        uint256 quantity,
        uint256 grossAmount,
        uint256 netAmount,
        bytes32 buyerRefHash,
        uint256 timestamp,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused {
        require(!settledSales[saleId], "Sale already settled");
        require(inventoryId != bytes32(0), "Invalid inventory ID");
        require(saleId != bytes32(0), "Invalid sale ID");
        require(netAmount <= grossAmount, "Net amount cannot exceed gross");

        // Construct EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                SALE_ATTESTATION_TYPEHASH,
                inventoryId,
                batchId,
                saleId,
                quantity,
                grossAmount,
                netAmount,
                buyerRefHash,
                timestamp,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(
            accessController.hasRole(accessController.ATTESTOR_ROLE(), signer) ||
            accessController.hasRole(accessController.VERIFIER_ROLE(), signer),
            "Signer is not an authorized attestor"
        );

        settledSales[saleId] = true;

        emit SaleAttested(inventoryId, batchId, saleId, quantity, grossAmount, netAmount, signer);
    }

    /**
     * @notice Records an explicit reversal/compensating adjustment for a previously settled sale
     */
    function reverseSale(
        bytes32 originalSaleId,
        bytes32 reversalId,
        bytes32 reasonHash
    ) external onlyRole(accessController.TREASURY_ROLE()) {
        require(settledSales[originalSaleId], "Original sale was not settled");
        require(saleReversals[originalSaleId] == bytes32(0), "Sale already reversed");
        require(reversalId != bytes32(0), "Invalid reversal ID");

        saleReversals[originalSaleId] = reversalId;

        emit SaleReversed(originalSaleId, reversalId, reasonHash);
    }
}
