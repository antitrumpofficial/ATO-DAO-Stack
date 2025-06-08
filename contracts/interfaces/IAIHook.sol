// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IAIHook – Interface for AI Governance & Risk Hook
/// @notice Used by ATO Token Contract to verify actions via AI Layer
interface IAIHook {
    /// @notice Called before token transfers to verify legality based on AI logic
    function verifyTransfer(address from, address to, uint256 amount) external view returns (bool);

    /// @notice Called before proposal execution to check AI compliance
    function verifyProposal(bytes32 proposalId, address target, uint256 value, bytes calldata data) external view returns (bool);

    /// @notice Called before treasury outflow to detect AI-blocked recipients
    function verifyTreasuryTransfer(address to, uint256 amount) external view returns (bool);
}
