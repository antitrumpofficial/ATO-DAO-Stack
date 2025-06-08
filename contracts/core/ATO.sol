// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

interface IAIHook {
    function verifyTransfer(address from, address to, uint256 amount) external view returns (bool);
    function verifyProposal(bytes32 proposalId, address target, uint256 value, bytes calldata data) external view returns (bool);
    function verifyTreasuryTransfer(address to, uint256 amount) external view returns (bool);
}

contract ATO is
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 private constant MAX_SUPPLY = 300_000_000 * 10**18;

    address public constant DAO_TREASURY = 0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548;
    address public constant CHARITY_WALLET = 0x81C7774e5dC5D099Be29ce861063286620C8192d;
    address public constant LIQUIDITY_WALLET = 0xf37a2571dC9a55Ceb3682C3cd4Ffe342c55757a6;
    address public constant MARKETING_WALLET = 0xf37a2571dC9a55Ceb3682C3cd4Ffe342c55757a6;
    address public constant DEPLOYER_WALLET = 0x616C518dec8BB15E5bFde9EE175c87782490548d;

    address public constant REWARDS_WALLET = 0xcfad82FE1Aa5a4c3215180ED77C673A2a223E8Cc;
    address public constant CIRCULATION_WALLET = 0xCf324C6a0184D001EcA1722EDAF52a93bACcBc0F;
    address public constant TAXES_WALLET = 0xddb5BaECC32C634A7242c9FeE80493129d9D5aDA;

    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant REFLECTION_FEE = 50;
    uint256 public constant BURN_FEE = 25;
    uint256 public constant DAO_FEE = 25;
    uint256 public constant MAX_WALLET_LIMIT = (MAX_SUPPLY * 25) / 1000;
    uint256 public constant MAX_TX_LIMIT = (MAX_SUPPLY * 10) / 1000;

    mapping(address => bool) private _isExcludedFromFees;
    uint256 private _totalReflected;
    mapping(bytes32 => bool) public executedProposals;

    IAIHook public aiHook;
    bool public emergencyPaused;

    event AIHookUpdated(address indexed newAIHook);
    event FeeDistributed(uint256 daoAmount, uint256 burnAmount, uint256 reflectionAmount);
    event EmergencyPaused();
    event EmergencyUnpaused();

    function initialize() public initializer {
        __ERC20_init("Anti Trump Official", "ATO");
        __ERC20Burnable_init();
        __ERC20Permit_init("Anti Trump Official");
        __ERC20Votes_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        address dao = DAO_TREASURY;
        address aiHookAddress = 0x8126833b3128355A65Bc6416cb08AD4926949eef;
        require(aiHookAddress.code.length > 0, "Invalid AI Hook: not a contract");

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);
        _grantRole(GUARDIAN_ROLE, dao);

        aiHook = IAIHook(aiHookAddress);

        _mint(CIRCULATION_WALLET, 120_000_000 * 10**18);
        _mint(REWARDS_WALLET, 24_000_000 * 10**18);
        _mint(DAO_TREASURY, 45_000_000 * 10**18);
        _mint(CHARITY_WALLET, 30_000_000 * 10**18);
        _mint(MARKETING_WALLET, 30_000_000 * 10**18);
        _mint(DEPLOYER_WALLET, 36_000_000 * 10**18);
        _mint(address(this), 15_000_000 * 10**18); // Liquidity

        _isExcludedFromFees[DAO_TREASURY] = true;
        _isExcludedFromFees[LIQUIDITY_WALLET] = true;
        _isExcludedFromFees[address(this)] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
        whenNotPaused
    {
        require(!emergencyPaused, "ATO: Emergency paused");

        if (
            from != address(0) && to != address(0) &&
            !_isExcludedFromFees[from] && !_isExcludedFromFees[to]
        ) {
            require(value <= MAX_TX_LIMIT, "ATO: Exceeds max tx limit");
            require(balanceOf(to) + value <= MAX_WALLET_LIMIT, "ATO: Exceeds max wallet limit");
            require(aiHook.verifyTransfer(from, to, value), "ATO: AI Hook blocked transfer");

            uint256 reflectionAmount = (value * REFLECTION_FEE) / FEE_DENOMINATOR;
            uint256 daoAmount = (value * DAO_FEE) / FEE_DENOMINATOR;
            uint256 burnAmount = (value * BURN_FEE) / FEE_DENOMINATOR;
            uint256 transferAmount = value - reflectionAmount - daoAmount - burnAmount;

            if (reflectionAmount > 0) {
                _totalReflected += reflectionAmount;
                emit FeeDistributed(daoAmount, burnAmount, reflectionAmount);
            }

            super._update(from, to, transferAmount);

            if (daoAmount > 0) super._update(from, DAO_TREASURY, daoAmount);
            if (burnAmount > 0) super._update(from, address(0), burnAmount);
        } else {
            super._update(from, to, value);
        }
    }

    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    function executeDAOProposal(
        bytes32 proposalId,
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyRole(DAO_ROLE) nonReentrant {
        require(!executedProposals[proposalId], "ATO: Proposal already executed");
        require(target != address(0), "ATO: Invalid target");
        require(aiHook.verifyProposal(proposalId, target, value, data), "ATO: AI Hook blocked proposal");

        executedProposals[proposalId] = true;

        (bool success, ) = target.call{value: value}(data);
        require(success, "ATO: Proposal execution failed");
    }

    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        emergencyPaused = true;
        emit EmergencyPaused();
    }

    function emergencyUnpause() external onlyRole(GUARDIAN_ROLE) {
        emergencyPaused = false;
        emit EmergencyUnpaused();
    }

    function daoTreasuryTransfer(address to, uint256 amount)
        external
        onlyRole(DAO_ROLE)
        nonReentrant
    {
        require(to != address(0), "ATO: Invalid recipient");
        require(aiHook.verifyTreasuryTransfer(to, amount), "ATO: AI Hook blocked treasury transfer");
        _transfer(DAO_TREASURY, to, amount);
    }

    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }

    function totalReflected() external view returns (uint256) {
        return _totalReflected;
    }
}
