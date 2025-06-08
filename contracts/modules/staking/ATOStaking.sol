// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title ATOStaking - DAO-Controlled Flexible Staking Module (Upgradeable)
/// @notice This module allows users to stake ATO tokens with flexible lock periods and reward rates set by DAO.
/// @dev Upgradeable via UUPS, compatible with Token Contract and Governance Stack.
contract ATOStaking is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    IERC20Upgradeable public stakingToken;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimed;
        uint256 lockPeriod;
    }

    mapping(address => Stake) public stakes;

    uint256 public baseRewardRate; // e.g. 500 = 5% annually
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant SECONDS_IN_YEAR = 365 days;

    event Staked(address indexed user, uint256 amount, uint256 lockPeriod);
    event Claimed(address indexed user, uint256 reward);
    event Unstaked(address indexed user, uint256 amount);
    event EmergencyUnstaked(address indexed user, uint256 amount, uint256 penalty);
    event RewardRateUpdated(uint256 newRate);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the staking module
    /// @param dao DAO address with control rights
    /// @param token ATO Token address
    /// @param initialRate Starting annual reward rate (e.g. 500 = 5%)
    function initialize(address dao, address token, uint256 initialRate) public initializer {
        require(dao != address(0) && token != address(0), "Invalid address");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);

        stakingToken = IERC20Upgradeable(token);
        baseRewardRate = initialRate;
    }

    /// @dev Authorize UUPS upgrade
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /// @notice Stake tokens with a lock period
    /// @param amount Amount to stake
    /// @param lockPeriod Duration in seconds
    function stake(uint256 amount, uint256 lockPeriod) external nonReentrant {
        require(amount > 0, "Must stake more than 0");
        require(lockPeriod >= 7 days, "Minimum lock 7d");

        if (stakes[msg.sender].amount > 0) {
            _claim(msg.sender);
        }

        stakingToken.transferFrom(msg.sender, address(this), amount);

        stakes[msg.sender].amount += amount;
        stakes[msg.sender].startTime = block.timestamp;
        stakes[msg.sender].lastClaimed = block.timestamp;
        stakes[msg.sender].lockPeriod = lockPeriod;

        emit Staked(msg.sender, amount, lockPeriod);
    }

    /// @dev Internal claim logic
    function _claim(address user) internal {
        Stake storage s = stakes[user];
        require(s.amount > 0, "Nothing staked");

        uint256 duration = block.timestamp - s.lastClaimed;
        uint256 reward = (s.amount * baseRewardRate * duration) / (SECONDS_IN_YEAR * DENOMINATOR);

        require(reward > 0, "No reward yet");
        s.lastClaimed = block.timestamp;
        stakingToken.transfer(user, reward);
        emit Claimed(user, reward);
    }

    /// @notice Claim staking rewards
    function claim() external nonReentrant {
        _claim(msg.sender);
    }

    /// @notice Unstake tokens after lock period ends
    function unstake() external nonReentrant {
        Stake storage s = stakes[msg.sender];
        require(s.amount > 0, "No stake");
        require(block.timestamp >= s.startTime + s.lockPeriod, "Still locked");

        _claim(msg.sender);
        uint256 amount = s.amount;
        s.amount = 0;
        stakingToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /// @notice Emergency unstake before lock period ends (with penalty)
    function emergencyUnstake() external nonReentrant {
        Stake storage s = stakes[msg.sender];
        require(s.amount > 0, "No stake");
        require(block.timestamp < s.startTime + s.lockPeriod, "Use unstake()");

        uint256 penalty = (s.amount * 300) / DENOMINATOR; // 3% penalty
        uint256 withdrawable = s.amount - penalty;
        s.amount = 0;

        stakingToken.transfer(msg.sender, withdrawable);
        stakingToken.transfer(address(0), penalty); // Burned
        emit EmergencyUnstaked(msg.sender, withdrawable, penalty);
    }

    /// @notice DAO-controlled reward update
    function updateRewardRate(uint256 newRate) external onlyRole(DAO_ROLE) {
        require(newRate <= 2000, "Too high"); // Max 20%
        baseRewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /// @notice Get current stake info for user
    function getStake(address user) external view returns (uint256, uint256, uint256, uint256) {
        Stake memory s = stakes[user];
        return (s.amount, s.startTime, s.lastClaimed, s.lockPeriod);
    }
}
