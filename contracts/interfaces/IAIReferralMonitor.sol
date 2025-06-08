// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IAIReferralMonitor – Interface for AI-based Referral Abuse Detection
/// @notice Used to detect suspicious, fake or circular referrals before rewards are given
interface IAIReferralMonitor {
    /// @notice Analyze a referral relation between two addresses
    /// @param referrer Address claiming the referral
    /// @param referee Address being referred
    /// @return bool True = abuse detected (block it), False = referral is clean
    function detectAbuse(address referrer, address referee) external view returns (bool);
}
