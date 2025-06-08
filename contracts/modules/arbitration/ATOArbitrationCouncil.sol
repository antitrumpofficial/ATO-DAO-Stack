// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IAIDisputeResolver {
    function validateDispute(bytes32 disputeId, address reporter, address reported, string calldata reason) external view returns (bool);
    function riskScore(address reported) external view returns (uint8);
}

/// @title ATOArbitrationCouncil - AI DAO Dispute & Governance Protection Layer
/// @notice Enables filing, reviewing, and resolving DAO-related disputes with AI-assist
contract ATOArbitrationCouncil is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant COUNCIL_ROLE = keccak256("COUNCIL_ROLE");

    enum DisputeStatus { Open, Resolved, Rejected }

    struct Dispute {
        address reporter;
        address reported;
        string reason;
        DisputeStatus status;
        uint256 createdAt;
        uint8 riskScore;
    }

    mapping(bytes32 => Dispute) public disputes;
    bytes32[] public disputeIds;

    IAIDisputeResolver public aiResolver;

    event DisputeFiled(bytes32 indexed id, address indexed reporter, address indexed reported, string reason);
    event DisputeResolved(bytes32 indexed id, bool accepted);
    event AIResolverUpdated(address resolver);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address dao, address resolver) public initializer {
        require(dao != address(0), "Invalid DAO");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);
        _grantRole(COUNCIL_ROLE, dao);

        aiResolver = IAIDisputeResolver(resolver);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /// @notice Submit a dispute to the DAO Arbitration Council
    function fileDispute(address reported, string calldata reason) external returns (bytes32) {
        require(reported != address(0), "Invalid reported");
        require(bytes(reason).length > 5, "Reason too short");

        bytes32 id = keccak256(abi.encodePacked(msg.sender, reported, reason, block.timestamp));
        require(disputes[id].createdAt == 0, "Already filed");

        uint8 risk = aiResolver.riskScore(reported);

        disputes[id] = Dispute({
            reporter: msg.sender,
            reported: reported,
            reason: reason,
            status: DisputeStatus.Open,
            createdAt: block.timestamp,
            riskScore: risk
        });

        disputeIds.push(id);
        emit DisputeFiled(id, msg.sender, reported, reason);
        return id;
    }

    /// @notice Resolve or reject a dispute (only Council)
    function resolveDispute(bytes32 id, bool accept) external onlyRole(COUNCIL_ROLE) {
        require(disputes[id].createdAt > 0, "Not found");
        require(disputes[id].status == DisputeStatus.Open, "Already handled");

        disputes[id].status = accept ? DisputeStatus.Resolved : DisputeStatus.Rejected;
        emit DisputeResolved(id, accept);
    }

    function getDispute(bytes32 id) external view returns (Dispute memory) {
        return disputes[id];
    }

    function getDisputeIds() external view returns (bytes32[] memory) {
        return disputeIds;
    }

    function updateAIResolver(address resolver) external onlyRole(DAO_ROLE) {
        require(resolver != address(0), "Invalid address");
        aiResolver = IAIDisputeResolver(resolver);
        emit AIResolverUpdated(resolver);
    }
}
