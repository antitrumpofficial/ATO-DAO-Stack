// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library SafeReflection {
    /// @notice Calculates proportional reward from total reflections based on holder’s balance
    /// @param holderBalance The token balance of the holder
    /// @param totalSupply Total token supply (excluding excluded addresses)
    /// @param reflectionPool The pool of tokens available for reflection
    function calculateReward(
        uint256 holderBalance,
        uint256 totalSupply,
        uint256 reflectionPool
    ) internal pure returns (uint256) {
        if (totalSupply == 0) return 0;
        return (reflectionPool * holderBalance) / totalSupply;
    }

    /// @notice Ensures a minimum reward threshold
    function applyMinimum(uint256 reward, uint256 min) internal pure returns (uint256) {
        return reward < min ? min : reward;
    }

    /// @notice Caps maximum reflection per wallet
    function capMaximum(uint256 reward, uint256 max) internal pure returns (uint256) {
        return reward > max ? max : reward;
    }
}
