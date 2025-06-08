// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IAIDisputeResolver – Interface for AI-based Dispute Risk Engine
/// @notice Used to validate and score DAO disputes before resolution
interface IAIDisputeResolver {
    /// @notice Validate if a dispute should be allowed based on AI analysis
    /// @param disputeId Unique hashed identifier of the dispute
    /// @param reporter Address who filed the dispute
    /// @param reported Address accused in the dispute
    /// @param reason The string reason or description
    /// @return bool Whether the dispute is valid or should be rejected
    function validateDispute(
        bytes32 disputeId,
        address reporter,
        address reported,
        string calldata reason
    ) external view returns (bool);

    /// @notice Return a risk score (0-100) for a reported address based on AI analysis
    /// @param reported The address being analyzed
    /// @return uint8 Risk score (0 = safe, 100 = max threat)
    function riskScore(address reported) external view returns (uint8);
}
