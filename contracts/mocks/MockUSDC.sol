// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USD Coin for local testing, staging, and live demos.
 * @dev Replicates real USDC behavior with 6 decimals and includes a faucet/mint function.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        // Pre-mint 1,000,000 USDC to deployer for quick testing
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice USDC uses 6 decimals instead of standard 18.
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Public mint/faucet function to easily fund investor and tester wallets during demos.
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
