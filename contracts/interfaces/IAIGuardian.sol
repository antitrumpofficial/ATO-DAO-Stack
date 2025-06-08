// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title AIGuardianUpgradeable – Upgradeable AI Hook Logic (On-chain Risk Filter)
/// @notice Verifies transfers and DAO proposals based on static risk and blacklist logic
contract AIGuardianUpgradeable is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    mapping(address => bool) public blacklisted;
    mapping(address => uint8) public riskScore;
    mapping(bytes32 => bool) public flaggedProposals;

    uint256 public maxTransferThreshold;

    event AddressBlacklisted(address indexed addr, bool status);
    event RiskScoreUpdated(address indexed addr, uint8 score);
    event ProposalFlagged(bytes32 indexed proposalId, bool blocked);
    event ThresholdUpdated(uint256 newLimit);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializer for UUPS deployment
    function initialize(address dao) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);

        maxTransferThreshold = 100_000 * 10 ** 18; // default threshold
    }

    /// @dev Required for UUPS upgrade control
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ───────────────────────────────
    // ✅ External Verification Hooks
    // ───────────────────────────────

    function verifyTransfer(address to, uint256 amount) external view returns (bool) {
        if (blacklisted[to]) return false;
        if (amount > maxTransferThreshold) return false;
        if (riskScore[to] > 80) return false;
        return true;
    }

    function scoreTransfer(address to, uint256 amount) external view returns (uint8) {
        uint8 score = riskScore[to];
        if (amount > maxTransferThreshold / 2) score += 10;
        return score;
    }

    function verifyProposal(bytes32 proposalId, address, uint256, bytes calldata) external view returns (bool) {
        return !flaggedProposals[proposalId];
    }

    // ───────────────────────────────
    // ✅ DAO-Controlled Functions
    // ───────────────────────────────

    function blacklistAddress(address addr, bool status) external onlyRole(DAO_ROLE) {
        blacklisted[addr] = status;
        emit AddressBlacklisted(addr, status);
    }

    function updateRiskScore(address addr, uint8 score) external onlyRole(DAO_ROLE) {
        require(score <= 100, "Invalid score");
        riskScore[addr] = score;
        emit RiskScoreUpdated(addr, score);
    }

    function flagProposal(bytes32 proposalId, bool status) external onlyRole(DAO_ROLE) {
        flaggedProposals[proposalId] = status;
        emit ProposalFlagged(proposalId, status);
    }

    function setMaxTransferThreshold(uint256 newLimit) external onlyRole(DAO_ROLE) {
        maxTransferThreshold = newLimit;
        emit ThresholdUpdated(newLimit);
    }
}
