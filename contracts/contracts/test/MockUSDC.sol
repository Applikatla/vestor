// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Test ERC-20 token simulating 6-decimal or 18-decimal stablecoin for tests and testnet
 */
contract MockUSDC is ERC20 {
    uint8 private _customDecimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _customDecimals = decimals_;
        _mint(msg.sender, 10_000_000 * 10 ** decimals_);
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
