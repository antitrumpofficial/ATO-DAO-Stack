// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IAIRiskEngine {
    function scoreNGO(address ngo, string calldata purpose, uint256 amount) external view returns (uint8);
}

/// @title ATONGOFund – NGO Integration & DAO Fund Management
/// @notice Handles NGO registration, fund requests, DAO-controlled approvals, and AI-based risk scoring
contract ATONGOFund is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    struct NGOInfo {
        bool registered;
        string name;
        string website;
    }

    struct FundRequest {
        address ngo;
        string purpose;
        uint256 amount;
        bool approved;
        bool executed;
        uint8 riskScore;
    }

    IERC20Upgradeable public token;
    IAIRiskEngine public riskEngine;

    mapping(address => NGOInfo) public ngos;
    FundRequest[] public requests;

    event NGORegistered(address indexed ngo, string name);
    event RequestSubmitted(uint256 indexed id, address ngo, string purpose, uint256 amount);
    event RequestApproved(uint256 indexed id);
    event FundsDisbursed(uint256 indexed id, address ngo, uint256 amount);
    event RiskEngineUpdated(address engine);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address dao, address tokenAddress) public initializer {
        require(dao != address(0) && tokenAddress != address(0), "Invalid address");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);

        token = IERC20Upgradeable(tokenAddress);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /// @notice DAO registers a verified NGO
    function registerNGO(address ngo, string memory name, string memory website) external onlyRole(DAO_ROLE) {
        require(ngo != address(0), "Invalid NGO address");
        ngos[ngo] = NGOInfo(true, name, website);
        emit NGORegistered(ngo, name);
    }

    /// @notice Registered NGO submits a fund request
    function submitRequest(string memory purpose, uint256 amount) external returns (uint256) {
        require(ngos[msg.sender].registered, "NGO not registered");
        require(amount > 0, "Amount must be > 0");

        uint8 risk = 0;
        if (address(riskEngine) != address(0)) {
            risk = riskEngine.scoreNGO(msg.sender, purpose, amount);
        }

        FundRequest memory req = FundRequest({
            ngo: msg.sender,
            purpose: purpose,
            amount: amount,
            approved: false,
            executed: false,
            riskScore: risk
        });

        requests.push(req);
        emit RequestSubmitted(requests.length - 1, msg.sender, purpose, amount);
        return requests.length - 1;
    }

    /// @notice DAO approves a fund request
    function approveRequest(uint256 id) external onlyRole(DAO_ROLE) {
        require(id < requests.length, "Invalid ID");
        require(!requests[id].approved, "Already approved");
        requests[id].approved = true;
        emit RequestApproved(id);
    }

    /// @notice DAO disburses funds for approved request
    function disburseFunds(uint256 id) external onlyRole(DAO_ROLE) nonReentrant {
        require(id < requests.length, "Invalid ID");
        FundRequest storage r = requests[id];
        require(r.approved && !r.executed, "Not ready");
        r.executed = true;

        require(token.balanceOf(address(this)) >= r.amount, "Insufficient funds");
        token.transfer(r.ngo, r.amount);
        emit FundsDisbursed(id, r.ngo, r.amount);
    }

    /// @notice DAO sets or updates external AI risk engine
    function setRiskEngine(address engine) external onlyRole(DAO_ROLE) {
        riskEngine = IAIRiskEngine(engine);
        emit RiskEngineUpdated(engine);
    }

    /// @notice View function to retrieve a fund request
    function getRequest(uint256 id) external view returns (FundRequest memory) {
        require(id < requests.length, "Invalid ID");
        return requests[id];
    }

    /// @notice Returns total number of requests
    function getRequestCount() external view returns (uint256) {
        return requests.length;
    }
}
