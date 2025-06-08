// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IAIGuardian {
    function verifyTransfer(address to, uint256 amount) external view returns (bool);
    function scoreTransfer(address to, uint256 amount) external view returns (uint8);
}

contract ATOTreasury is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IERC20Upgradeable public token;
    IAIGuardian public guardian;

    address[] public signers;
    uint256 public requiredApprovals;
    bool public circuitPaused;

    struct TransferRequest {
        address to;
        uint256 amount;
        uint256 approvals;
        bool executed;
        mapping(address => bool) approvedBy;
    }

    mapping(uint256 => TransferRequest) public transfers;
    uint256 public transferCounter;

    event SignerAdded(address signer);
    event TransferProposed(uint256 id, address to, uint256 amount);
    event TransferApproved(uint256 id, address signer);
    event TransferExecuted(uint256 id);
    event CircuitBreakerActivated();
    event CircuitBreakerDeactivated();
    event GuardianUpdated(address newGuardian);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address dao,
        address tokenAddr,
        address guardianAddr,
        address[] memory initialSigners,
        uint256 minApprovals
    ) public initializer {
        require(dao != address(0) && tokenAddr != address(0), "Invalid address");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);
        _grantRole(GUARDIAN_ROLE, dao);

        token = IERC20Upgradeable(tokenAddr);
        guardian = IAIGuardian(guardianAddr);

        for (uint i = 0; i < initialSigners.length; i++) {
            signers.push(initialSigners[i]);
        }

        requiredApprovals = minApprovals;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function proposeTransfer(address to, uint256 amount) external onlyRole(DAO_ROLE) returns (uint256) {
        require(to != address(0), "Invalid address");
        require(!circuitPaused, "Circuit paused");
        require(guardian.verifyTransfer(to, amount), "AI: Transfer blocked");

        uint256 id = ++transferCounter;
        TransferRequest storage t = transfers[id];
        t.to = to;
        t.amount = amount;
        t.approvals = 0;
        t.executed = false;

        emit TransferProposed(id, to, amount);
        return id;
    }

    function approveTransfer(uint256 id) external nonReentrant {
        require(!circuitPaused, "Paused");
        require(id <= transferCounter, "Invalid ID");
        require(_isSigner(msg.sender), "Not signer");

        TransferRequest storage t = transfers[id];
        require(!t.executed, "Already done");
        require(!t.approvedBy[msg.sender], "Already approved");

        t.approvedBy[msg.sender] = true;
        t.approvals++;

        emit TransferApproved(id, msg.sender);

        if (t.approvals >= requiredApprovals) {
            _execute(id);
        }
    }

    function _execute(uint256 id) internal {
        TransferRequest storage t = transfers[id];
        require(!t.executed, "Already executed");
        require(token.balanceOf(address(this)) >= t.amount, "Insufficient funds");

        t.executed = true;
        token.transfer(t.to, t.amount);
        emit TransferExecuted(id);
    }

    function activateCircuitBreaker() external onlyRole(GUARDIAN_ROLE) {
        circuitPaused = true;
        emit CircuitBreakerActivated();
    }

    function deactivateCircuitBreaker() external onlyRole(GUARDIAN_ROLE) {
        circuitPaused = false;
        emit CircuitBreakerDeactivated();
    }

    function setGuardian(address g) external onlyRole(DAO_ROLE) {
        require(g != address(0), "Invalid address");
        guardian = IAIGuardian(g);
        emit GuardianUpdated(g);
    }

    function _isSigner(address account) internal view returns (bool) {
        for (uint i = 0; i < signers.length; i++) {
            if (signers[i] == account) return true;
        }
        return false;
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function getRiskScore(address to, uint256 amount) external view returns (uint8) {
        return guardian.scoreTransfer(to, amount);
    }
}
