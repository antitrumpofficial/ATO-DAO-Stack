const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIGuardianUpgradeable - Ultimate VC/Exchange Ready Test Suite", function () {
  let dao, nonDao, other, attacker, guardian, GuardianFactory;
  const DAO_ADDRESS = "0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548";
  const NON_DAO_ADDRESS = "0x81C7774e5dC5D099Be29ce861063286620C8192d";
  const ZERO_ADDRESS = ethers.ZeroAddress;

  beforeEach(async function () {
    [dao, nonDao, other, attacker] = await ethers.getSigners();
    GuardianFactory = await ethers.getContractFactory("AIGuardianUpgradeable");
    guardian = await GuardianFactory.deploy();
    await guardian.initialize(dao.address);
  });

  describe("Role & Access Control", function () {
    it("DAO_ROLE & DEFAULT_ADMIN_ROLE must be correctly assigned to DAO address", async function () {
      const DAO_ROLE = await guardian.DAO_ROLE();
      const DEFAULT_ADMIN_ROLE = await guardian.DEFAULT_ADMIN_ROLE();
      expect(await guardian.hasRole(DAO_ROLE, dao.address)).to.be.true;
      expect(await guardian.hasRole(DEFAULT_ADMIN_ROLE, dao.address)).to.be.true;
    });

    it("Should not allow non-DAO to manage DAO-only functions", async function () {
      await expect(
        guardian.connect(nonDao).blacklistAddress(NON_DAO_ADDRESS, true)
      ).to.be.revertedWith("AccessControl");
      await expect(
        guardian.connect(nonDao).updateRiskScore(NON_DAO_ADDRESS, 99)
      ).to.be.revertedWith("AccessControl");
      await expect(
        guardian.connect(nonDao).setMaxTransferThreshold(500)
      ).to.be.revertedWith("AccessControl");
    });

    it("DAO can transfer roles to new DAO", async function () {
      const DAO_ROLE = await guardian.DAO_ROLE();
      await guardian.grantRole(DAO_ROLE, other.address);
      expect(await guardian.hasRole(DAO_ROLE, other.address)).to.be.true;
      await guardian.revokeRole(DAO_ROLE, dao.address);
      expect(await guardian.hasRole(DAO_ROLE, dao.address)).to.be.false;
    });
  });

  describe("Business Logic: Blacklist, Risk, Threshold", function () {
    it("Default threshold must be 100,000 ether", async function () {
      expect(await guardian.maxTransferThreshold()).to.equal(ethers.parseEther("100000"));
    });

    it("DAO can blacklist and unblacklist", async function () {
      await guardian.connect(dao).blacklistAddress(NON_DAO_ADDRESS, true);
      expect(await guardian.blacklisted(NON_DAO_ADDRESS)).to.equal(true);
      await guardian.connect(dao).blacklistAddress(NON_DAO_ADDRESS, false);
      expect(await guardian.blacklisted(NON_DAO_ADDRESS)).to.equal(false);
    });

    it("DAO can update risk score within bounds", async function () {
      await guardian.connect(dao).updateRiskScore(NON_DAO_ADDRESS, 55);
      expect(await guardian.riskScore(NON_DAO_ADDRESS)).to.equal(55);
    });

    it("DAO cannot set risk score above 100", async function () {
      await expect(
        guardian.connect(dao).updateRiskScore(NON_DAO_ADDRESS, 150)
      ).to.be.revertedWith("Invalid score");
    });

    it("DAO can update maxTransferThreshold", async function () {
      await guardian.connect(dao).setMaxTransferThreshold(123456);
      expect(await guardian.maxTransferThreshold()).to.equal(123456);
    });
  });

  describe("Hook Logic: verifyTransfer, scoreTransfer, verifyProposal", function () {
    beforeEach(async function () {
      await guardian.connect(dao).blacklistAddress(NON_DAO_ADDRESS, false);
      await guardian.connect(dao).updateRiskScore(NON_DAO_ADDRESS, 20);
      await guardian.connect(dao).setMaxTransferThreshold(ethers.parseEther("100000"));
    });

    it("verifyTransfer: should allow safe transfer", async function () {
      expect(await guardian.verifyTransfer(NON_DAO_ADDRESS, ethers.parseEther("1"))).to.equal(true);
    });

    it("verifyTransfer: should block blacklisted address", async function () {
      await guardian.connect(dao).blacklistAddress(NON_DAO_ADDRESS, true);
      expect(await guardian.verifyTransfer(NON_DAO_ADDRESS, ethers.parseEther("1"))).to.equal(false);
    });

    it("verifyTransfer: should block riskScore > 80", async function () {
      await guardian.connect(dao).updateRiskScore(NON_DAO_ADDRESS, 99);
      expect(await guardian.verifyTransfer(NON_DAO_ADDRESS, ethers.parseEther("1"))).to.equal(false);
    });

    it("verifyTransfer: should block amount above threshold", async function () {
      expect(
        await guardian.verifyTransfer(NON_DAO_ADDRESS, ethers.parseEther("100001"))
      ).to.equal(false);
    });

    it("scoreTransfer: returns correct risk score and adds 10 for large amount", async function () {
      await guardian.connect(dao).updateRiskScore(NON_DAO_ADDRESS, 20);
      let score = await guardian.scoreTransfer(NON_DAO_ADDRESS, ethers.parseEther("1"));
      expect(score).to.equal(20);
      score = await guardian.scoreTransfer(NON_DAO_ADDRESS, ethers.parseEther("60000"));
      expect(score).to.equal(30); // 20 + 10 (since 60k > 50k)
    });

    it("verifyProposal: blocks flagged proposal and allows others", async function () {
      const pid = ethers.id("Proposal#1");
      expect(await guardian.verifyProposal(pid, ZERO_ADDRESS, 0, "0x")).to.equal(true);
      await guardian.connect(dao).flagProposal(pid, true);
      expect(await guardian.verifyProposal(pid, ZERO_ADDRESS, 0, "0x")).to.equal(false);
    });
  });

  describe("Security, Gas & Brute-force Tests", function () {
    it("Should not allow role escalation (non-DAO cannot grant themselves DAO_ROLE)", async function () {
      const DAO_ROLE = await guardian.DAO_ROLE();
      await expect(
        guardian.connect(nonDao).grantRole(DAO_ROLE, nonDao.address)
      ).to.be.revertedWith("AccessControl");
    });

    it("Brute-force: DAO can blacklist 100 random addresses", async function () {
      for (let i = 0; i < 100; i++) {
        let randomAddr = ethers.Wallet.createRandom().address;
        await guardian.connect(dao).blacklistAddress(randomAddr, true);
        expect(await guardian.blacklisted(randomAddr)).to.equal(true, `Random #${i} must be blacklisted`);
      }
    });

    it("Gas: Blacklisting should not exceed 60k gas", async function () {
      const tx = await guardian.connect(dao).blacklistAddress(other.address, true);
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(60000, "Blacklist gas too high!");
    });

    it("Gas: Risk update should not exceed 50k gas", async function () {
      const tx = await guardian.connect(dao).updateRiskScore(other.address, 50);
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(50000, "Risk update gas too high!");
    });

    // Upgrade logic usually not directly accessible, comment out unless needed for coverage:
    // it("Upgrade logic: Only DAO (admin) can authorize upgrade", async function () {
    //   await expect(
    //     guardian.connect(nonDao)._authorizeUpgrade(other.address)
    //   ).to.be.revertedWith("AccessControl");
    // });
  });

  describe("Edge-cases & Failures", function () {
    it("Should not flag proposal by non-DAO", async function () {
      const pid = ethers.id("Proposal#Bad");
      await expect(
        guardian.connect(nonDao).flagProposal(pid, true)
      ).to.be.revertedWith("AccessControl");
    });
    it("Should not set risk score above 100 (or negative)", async function () {
      await expect(
        guardian.connect(dao).updateRiskScore(other.address, 255)
      ).to.be.revertedWith("Invalid score");
    });
    it("Should revert if not initialized", async function () {
      const g2 = await GuardianFactory.deploy();
      await expect(
        g2.blacklistAddress(other.address, true)
      ).to.be.reverted;
    });
  });
});
