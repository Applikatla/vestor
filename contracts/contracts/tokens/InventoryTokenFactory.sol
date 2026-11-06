// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./InventoryToken.sol";
import "../access/AccessController.sol";

/**
 * @title InventoryTokenFactory
 * @notice Factory that deploys and indexes issuance-specific InventoryToken contracts
 */
contract InventoryTokenFactory {
    AccessController public immutable accessController;

    // issuanceId => deployed token address
    mapping(bytes32 => address) public tokens;
    // token address => issuanceId
    mapping(address => bytes32) public tokenIssuance;
    // list of all deployed tokens
    address[] public allTokens;

    event TokenCreated(
        bytes32 indexed issuanceId,
        bytes32 indexed inventoryId,
        address tokenAddress,
        bytes32 termsHash,
        uint256 maxSupply
    );

    modifier onlyRole(bytes32 role) {
        require(accessController.hasRole(role, msg.sender), "Factory: unauthorized");
        _;
    }

    constructor(address accessControllerAddress) {
        require(accessControllerAddress != address(0), "Invalid access controller");
        accessController = AccessController(accessControllerAddress);
    }

    /**
     * @notice Deploys a new InventoryToken contract
     */
    function createToken(
        string memory name,
        string memory symbol,
        bytes32 inventoryId,
        bytes32 issuanceId,
        bytes32 termsHash,
        uint256 maxSupply
    ) external onlyRole(accessController.REGISTRAR_ROLE()) returns (address) {
        require(tokens[issuanceId] == address(0), "Issuance already has a token");

        InventoryToken token = new InventoryToken(
            name,
            symbol,
            inventoryId,
            issuanceId,
            termsHash,
            maxSupply,
            address(this)
        );

        address tokenAddr = address(token);
        tokens[issuanceId] = tokenAddr;
        tokenIssuance[tokenAddr] = issuanceId;
        allTokens.push(tokenAddr);

        // Grant caller administrative and compliance roles on the newly deployed token
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), msg.sender);
        token.grantRole(token.COMPLIANCE_ROLE(), msg.sender);

        emit TokenCreated(issuanceId, inventoryId, tokenAddr, termsHash, maxSupply);

        return tokenAddr;
    }

    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }
}
