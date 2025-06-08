const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATOReferral – Full Security/Logic/Brute-Force Test Suite", function () {
  let deployer, dao, referrer, user, user2, user3, token, referral, monitor, MonitorMock;

  beforeEach(async function () {
    [deployer, dao, referrer, user, user2, user3, ...addrs] = await ethers.getSigners();
    // Mock reward token
    const ERC20Mock = await ethers.getContractFactory("contracts/core/ATO.sol:ATO");
    token = await ERC20Mock.deploy();
    await token.initialize();
    // Mint tokens to referral contract for reward payments
    await token.connect(deployer).transfer(deployer.address, ethers.utils.parseEther("100000"));
    // Mock AI abuse monitor
    MonitorMock = await ethers.getContractFactory("MockReferralMonitor");
    monitor = await MonitorMock.deploy();
    // Deploy referral contract
    const Referral = await ethers.getContractFactory("ATOReferral");
    referral = await Referral.deploy();
    await referral.initialize(deployer.address, token.address, monitor.address);
    // Fund referral contract for rewards
    await token.connect(deployer).transfer(referral.address, ethers.utils.parseEther("10000"));
  });

  describe("Roles & Initialization", function () {
    it("DAO_ROLE & DEFAULT_ADMIN_ROLE assigned to deployer/DAO", async function () {
      const DAO_ROLE = await referral.DAO_ROLE();
      expect(await referral.hasRole(DAO_ROLE, deployer.address)).to.equal(true);
      expect(await referral.hasRole(await referral.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
    });
    it("Should not initialize with zero address", async function () {
      const Referral = await ethers.getContractFactory("ATOReferral");
      await expect(
        Referral.deploy().then(c => c.initialize(ethers.constants.AddressZero, token.address, monitor.address))
      ).to.be.revertedWith("Invalid address");
      await expect(
        Referral.deploy().then(c => c.initialize(deployer.address, ethers.constants.AddressZero, monitor.address))
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Referral Registration", function () {
    it("User can register valid referral (not self, not repeated, not zero)", async function () {
      await expect(referral.connect(user).registerReferral(referrer.address))
        .to.emit(referral, "ReferralRegistered").withArgs(user.address, referrer.address);
      expect(await referral.referrerOf(user.address)).to.equal(referrer.address);
      expect(await referral.referralCount(referrer.address)).to.equal(1);
      // Can't repeat
      await expect(referral.connect(user).registerReferral(referrer.address)).to.be.revertedWith("Already referred");
    });
    it("Should reject self-referral or zero referrer", async function () {
      await expect(referral.connect(user).registerReferral(ethers.constants.AddressZero)).to.be.revertedWith("Invalid referrer");
      await expect(referral.connect(user).registerReferral(user.address)).to.be.revertedWith("Self-referral not allowed");
    });
    it("Should reject if AI monitor detects abuse", async function () {
      await monitor.setAbusive(referrer.address, user2.address, true);
      await expect(
        referral.connect(user2).registerReferral(referrer.address)
      ).to.be.revertedWith("AI: suspicious referral");
    });
  });

  describe("Referral Reward Process", function () {
    it("Only DAO_ROLE can process rewards", async function () {
      await referral.connect(user).registerReferral(referrer.address);
      await expect(
        referral.connect(user).processReferralReward(user.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("AccessControl");
    });
    it("Rewards are paid out with correct rates, balances updated", async function () {
      await referral.connect(user2).registerReferral(referrer.address);
      const amt = ethers.utils.parseEther("1000");
      await expect(
        referral.connect(deployer).processReferralReward(user2.address, amt)
      ).to.emit(referral, "ReferralRewardPaid");
      const refRate = await referral.referrerBonusRate();
      const userRate = await referral.refereeBonusRate();
      const refExpected = amt.mul(refRate).div(await referral.DENOMINATOR());
      const userExpected = amt.mul(userRate).div(await referral.DENOMINATOR());
      expect(await token.balanceOf(referrer.address)).to.equal(refExpected);
      expect(await token.balanceOf(user2.address)).to.equal(userExpected);
      expect(await referral.referralRewards(referrer.address)).to.equal(refExpected);
    });
    it("Should revert if contract has insufficient rewards", async function () {
      await referral.connect(user3).registerReferral(referrer.address);
      await expect(
        referral.connect(deployer).processReferralReward(user3.address, ethers.utils.parseEther("999999999"))
      ).to.be.revertedWith("Insufficient rewards");
    });
    it("Should not pay reward if no referrer", async function () {
      await expect(
        referral.connect(deployer).processReferralReward(user.address, ethers.utils.parseEther("1000"))
      ).to.not.emit(referral, "ReferralRewardPaid");
    });
  });

  describe("DAO Controls, Security, Gas, Edge-cases", function () {
    it("Only DAO_ROLE can update reward rates, token, monitor", async function () {
      await expect(referral.connect(user).setRewardRates(200, 200)).to.be.revertedWith("AccessControl");
      await expect(referral.connect(deployer).setRewardRates(200, 200)).to.emit(referral, "RewardRatesUpdated");
      await expect(referral.connect(deployer).setRewardRates(1001, 100)).to.be.revertedWith("Too high");
      await expect(referral.connect(user).setRewardToken(token.address)).to.be.revertedWith("AccessControl");
      await expect(referral.connect(deployer).setRewardToken(token.address)).to.emit(referral, "RewardTokenSet");
      await expect(referral.connect(deployer).setAbuseMonitor(monitor.address)).to.emit(referral, "AbuseMonitorUpdated");
    });
    it("Should return referral info accurately", async function () {
      await referral.connect(user2).registerReferral(referrer.address);
      const info = await referral.getReferralInfo(user2.address);
      expect(info[0]).to.equal(referrer.address);
      expect(info[1]).to.equal(0);
      expect(info[2]).to.equal(0);
      // For referrer
      const infoRef = await referral.getReferralInfo(referrer.address);
      expect(infoRef[1]).to.equal(1);
    });
    it("Gas usage for referral registration under 80k", async function () {
      const tx = await referral.connect(user).registerReferral(referrer.address);
      const receipt = await tx.wait();
      expect(receipt.gasUsed.toNumber()).to.be.lessThan(80000, "Referral register gas too high!");
    });
  });

  describe("Abuse Detection & Brute-force", function () {
    it("Should process 100 sequential referrals without failure", async function () {
      for (let i = 0; i < 100; i++) {
        let newUser = ethers.Wallet.createRandom();
        // Fund new user (simulate Airdrop)
        await token.connect(deployer).transfer(newUser.address, ethers.utils.parseEther("1"));
        // Impersonate signer for test
        await ethers.provider.send("hardhat_impersonateAccount", [newUser.address]);
        const newSigner = await ethers.getSigner(newUser.address);
        await referral.connect(newSigner).registerReferral(referrer.address);
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [newUser.address]);
      }
      expect(await referral.referralCount(referrer.address)).to.equal(100);
    });
  });
});

// --- MockReferralMonitor for abuse simulation ---
/*
Place this code in contracts/MockReferralMonitor.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract MockReferralMonitor {
    mapping(address => mapping(address => bool)) public abusive;

    function setAbusive(address referrer, address referee, bool isAbusive) public {
        abusive[referrer][referee] = isAbusive;
    }
    function detectAbuse(address referrer, address referee) external view returns (bool) {
        return abusive[referrer][referee];
    }
}
*/
}