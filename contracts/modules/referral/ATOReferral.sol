// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IAIReferralMonitor {
    function detectAbuse(address referrer, address referee) external view returns (bool);
}

/// @title ATOReferral - DAO-Controlled Referral Engine with AI Abuse Detection
contract ATOReferral is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    mapping(address => address) public referrerOf;
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralRewards;

    uint256 public referrerBonusRate; // e.g. 200 = 2%
    uint256 public refereeBonusRate;  // e.g. 100 = 1%
    uint256 public constant DENOMINATOR = 10000;

    IERC20Upgradeable public rewardToken;
    IAIReferralMonitor public abuseMonitor;

    event ReferralRegistered(address indexed user, address indexed referrer);
    event ReferralRewardPaid(address indexed referrer, address indexed user, uint256 refReward, uint256 userReward);
    event RewardRatesUpdated(uint256 referrerRate, uint256 refereeRate);
    event RewardTokenSet(address token);
    event AbuseMonitorUpdated(address monitor);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address dao, address token, address monitor) public initializer {
        require(dao != address(0) && token != address(0), "Invalid address");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);

        referrerBonusRate = 200; // 2%
        refereeBonusRate = 100;  // 1%
        rewardToken = IERC20Upgradeable(token);
        abuseMonitor = IAIReferralMonitor(monitor);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function registerReferral(address referrer) external {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Self-referral not allowed");
        require(referrerOf[msg.sender] == address(0), "Already referred");

        require(!abuseMonitor.detectAbuse(referrer, msg.sender), "AI: suspicious referral");

        referrerOf[msg.sender] = referrer;
        referralCount[referrer] += 1;

        emit ReferralRegistered(msg.sender, referrer);
    }

    function processReferralReward(address user, uint256 amount) external onlyRole(DAO_ROLE) nonReentrant {
        address referrer = referrerOf[user];
        if (referrer != address(0) && amount > 0) {
            uint256 refReward = (amount * referrerBonusRate) / DENOMINATOR;
            uint256 userReward = (amount * refereeBonusRate) / DENOMINATOR;

            uint256 totalReward = refReward + userReward;
            require(rewardToken.balanceOf(address(this)) >= totalReward, "Insufficient rewards");

            rewardToken.transfer(referrer, refReward);
            rewardToken.transfer(user, userReward);

            referralRewards[referrer] += refReward;
            emit ReferralRewardPaid(referrer, user, refReward, userReward);
        }
    }

    function setRewardRates(uint256 refRate, uint256 userRate) external onlyRole(DAO_ROLE) {
        require(refRate <= 1000 && userRate <= 1000, "Too high");
        referrerBonusRate = refRate;
        refereeBonusRate = userRate;
        emit RewardRatesUpdated(refRate, userRate);
    }

    function setRewardToken(address token) external onlyRole(DAO_ROLE) {
        require(token != address(0), "Invalid token");
        rewardToken = IERC20Upgradeable(token);
        emit RewardTokenSet(token);
    }

    function setAbuseMonitor(address monitor) external onlyRole(DAO_ROLE) {
        require(monitor != address(0), "Invalid monitor");
        abuseMonitor = IAIReferralMonitor(monitor);
        emit AbuseMonitorUpdated(monitor);
    }

    function getReferralInfo(address user) external view returns (address, uint256, uint256) {
        return (
            referrerOf[user],
            referralCount[user],
            referralRewards[user]
        );
    }
}
