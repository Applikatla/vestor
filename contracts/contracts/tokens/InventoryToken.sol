// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title InventoryToken
 * @notice Issuance-specific ERC-20 token representing financing units tied to registered inventory
 */
contract InventoryToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    bytes32 public immutable inventoryId;
    bytes32 public immutable issuanceId;
    bytes32 public immutable termsHash;
    uint256 public immutable maxSupply;

    bool public transferRestrictionsEnabled = true;

    mapping(address => bool) public isAllowlisted;
    mapping(address => uint256) public lockupUntil;

    event AllowlistUpdated(address indexed account, bool status);
    event LockupUpdated(address indexed account, uint256 lockupTimestamp);
    event RestrictionsToggled(bool enabled);

    constructor(
        string memory name,
        string memory symbol,
        bytes32 _inventoryId,
        bytes32 _issuanceId,
        bytes32 _termsHash,
        uint256 _maxSupply,
        address admin
    ) ERC20(name, symbol) {
        require(admin != address(0), "Invalid admin");
        require(_inventoryId != bytes32(0), "Invalid inventory ID");
        require(_issuanceId != bytes32(0), "Invalid issuance ID");
        require(_termsHash != bytes32(0), "Invalid terms hash");
        require(_maxSupply > 0, "Max supply must be > 0");

        inventoryId = _inventoryId;
        issuanceId = _issuanceId;
        termsHash = _termsHash;
        maxSupply = _maxSupply;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);
    }

    function setAllowlist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        isAllowlisted[account] = status;
        emit AllowlistUpdated(account, status);
    }

    function batchSetAllowlist(address[] calldata accounts, bool status) external onlyRole(COMPLIANCE_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            isAllowlisted[accounts[i]] = status;
            emit AllowlistUpdated(accounts[i], status);
        }
    }

    function setLockup(address account, uint256 timestamp) external onlyRole(COMPLIANCE_ROLE) {
        lockupUntil[account] = timestamp;
        emit LockupUpdated(account, timestamp);
    }

    function setRestrictionsEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transferRestrictionsEnabled = enabled;
        emit RestrictionsToggled(enabled);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply cap");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(from, amount);
    }

    /**
     * @dev Overrides ERC-20 transfer hook to enforce Pausable, Allowlist, and Lockup policies
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);

        // Skip restrictions for minting (from == 0) and burning (to == 0)
        if (transferRestrictionsEnabled && from != address(0) && to != address(0)) {
            require(block.timestamp >= lockupUntil[from], "Tokens are currently locked");
            require(isAllowlisted[from], "Sender not allowlisted");
            require(isAllowlisted[to], "Recipient not allowlisted");
        }
    }
}
