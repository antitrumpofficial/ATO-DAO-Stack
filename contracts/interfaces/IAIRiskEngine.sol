// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IAIRiskEngine – Interface for AI-based Risk Scoring Engine
/// @notice Used by DAO modules to score NGO requests, transfers, or identities
interface IAIRiskEngine {
    /// @notice Score a funding request from an NGO based on metadata and amount
    /// @param ngo Address of the NGO requesting funds
    /// @param purpose Description or category of the request
    /// @param amount Requested fund amount
    /// @return score Risk score (0 = safe, 100 = critical)
    function scoreNGO(address ngo, string calldata purpose, uint256 amount) external view returns (uint8);
}
