// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title InventoryERC20
 * @notice Official OpenZeppelin ERC-20 implementation for tokenized inventory financing.
 * @dev Inherits directly from OpenZeppelin's ERC20 contract.
 *      Exposes controlled mint and burn functions restricted strictly to the FinancingVault.
 */
contract InventoryERC20 is ERC20 {
    error Unauthorized();
    error ExceedsMaxSupply(uint256 requested, uint256 maxSupply);

    bytes32 public immutable inventoryId;
    bytes32 public immutable issuanceTermsHash;
    address public immutable vault;
    uint256 public immutable maxSupply;

    modifier onlyVault() {
        if (msg.sender != vault) revert Unauthorized();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 _inventoryId,
        bytes32 _issuanceTermsHash,
        address _vault,
        uint256 _maxSupply
    ) ERC20(name_, symbol_) {
        inventoryId = _inventoryId;
        issuanceTermsHash = _issuanceTermsHash;
        vault = _vault;
        maxSupply = _maxSupply;
    }

    /**
     * @notice Mints tokens to investors upon verified stablecoin deposit in FinancingVault.
     * @dev Uses OpenZeppelin's internal _mint function which correctly manages balances and emissions.
     */
    function mint(address to, uint256 amount) external onlyVault {
        if (maxSupply > 0 && totalSupply() + amount > maxSupply) {
            revert ExceedsMaxSupply(totalSupply() + amount, maxSupply);
        }
        _mint(to, amount);
    }

    /**
     * @notice Burns tokens upon settlement/redemption or repayment distribution.
     * @dev Uses OpenZeppelin's internal _burn function which safely checks balances and decreases totalSupply.
     */
    function burn(address from, uint256 amount) external onlyVault {
        _burn(from, amount);
    }
}
