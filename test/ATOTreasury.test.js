const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATOTreasury – Multisig Treasury & AI Guardian VC-Ready Test Suite", function () {
  let deployer, dao, guardian, signer1, signer2, signer3, nonSigner, token, treasury, aiGuardian, AIGuardianMock;

  beforeEach(async function () {
    [deployer, dao, guardian, signer1, signer2, signer3, nonSigner] = await ethers.getSigners();
    // Deploy mock token (ATO)
    const ERC20Mock = await ethers.getContractFactory("contracts/core/ATO.sol:ATO");
    token = await ERC20Mock.deploy();
    await token.initialize();
    await token.connect(deployer).transfer(deployer.address, ethers.utils.parseEther("100000"));
    // Deploy mock AI Guardian
    AIGuardianMock = await ethers.getContractFactory("MockAIGuardian");
    aiGuardian = await AIGuardianMock.deploy();
    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("ATOTreasury");
    treasury = await Treasury.deploy();
    await treasury.initialize(
      deployer.address,
      token.address,
      aiGuardian.address,
      [signer1.address, signer2.address, signer3.address],
      2 // 2 of 3 multisig
    );
    // Fund treasury
    await token.connect(deployer).transfer(treasury.address, ethers.utils.parseEther("10000"));
  });

  describe("Initialization & Roles", function () {
    it("DAO, GUARDIAN, DEFAULT_ADMIN roles assigned", async function () {
      const DAO_ROLE = await treasury.DAO_ROLE();
      expect(await treasury.hasRole(DAO_ROLE, deployer.address)).to.be.true;
      expect(await treasury.hasRole(await treasury.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await treasury.hasRole(await treasury.GUARDIAN_ROLE(), deployer.address)).to.be.true;
    });
    it("Signers are set correctly", async function () {
      const signers = await treasury.getSigners();
      expect(signers.length).to.equal(3);
      expect(signers).to.include(signer1.address);
      expect(signers).to.include(signer2.address);
      expect(signers).to.include(signer3.address);
    });
  });

  describe("Propose, Approve, Execute Transfers (Multisig)", function () {
    it("Only DAO_ROLE can propose transfer, only signers can approve", async function () {
      await expect(
        treasury.connect(nonSigner).proposeTransfer(signer1.address, ethers.utils.parseEther("10"))
      ).to.be.revertedWith("AccessControl");
      const tx = await treasury.connect(deployer).proposeTransfer(signer1.address, ethers.utils.parseEther("10"));
      const id = tx.value ? tx.value : 1;
      await expect(
        treasury.connect(nonSigner).approveTransfer(id)
      ).to.be.revertedWith("Not signer");
    });

    it("Transfer executes after enough signer approvals, reverts if already executed", async function () {
      // Propose
      const tx = await treasury.connect(deployer).proposeTransfer(signer1.address, ethers.utils.parseEther("100"));
      const id = await treasury.transferCounter();
      // Approve by 2 signers
      await treasury.connect(signer1).approveTransfer(id);
      await expect(
        treasury.connect(signer1).approveTransfer(id)
      ).to.be.revertedWith("Already approved");
      await treasury.connect(signer2).approveTransfer(id);
      expect(await token.balanceOf(signer1.address)).to.equal(ethers.utils.parseEther("100"));
      // Second approval triggers execution
      const req = await treasury.transfers(id);
      expect(req.executed).to.be.true;
      await expect(
        treasury.connect(signer3).approveTransfer(id)
      ).to.be.revertedWith("Already done");
    });

    it("Should not execute if not enough approvals, or if circuit breaker is active", async function () {
      // Propose
      const tx = await treasury.connect(deployer).proposeTransfer(signer2.address, ethers.utils.parseEther("222"));
      const id = await treasury.transferCounter();
      // Only one signer approves (not enough)
      await treasury.connect(signer1).approveTransfer(id);
      expect(await token.balanceOf(signer2.address)).to.equal(0);
      // Circuit breaker
      await treasury.connect(deployer).activateCircuitBreaker();
      await expect(
        treasury.connect(signer2).approveTransfer(id)
      ).to.be.revertedWith("Paused");
    });
    it("Should revert if not enough funds", async function () {
      const tx = await treasury.connect(deployer).proposeTransfer(signer1.address, ethers.utils.parseEther("999999999"));
      const id = await treasury.transferCounter();
      await treasury.connect(signer1).approveTransfer(id);
      await expect(
        treasury.connect(signer2).approveTransfer(id)
      ).to.be.revertedWith("Insufficient funds");
    });
  });

  describe("Circuit Breaker & Guardian", function () {
    it("Only GUARDIAN_ROLE can activate/deactivate circuit breaker", async function () {
      await expect(treasury.connect(signer1).activateCircuitBreaker()).to.be.revertedWith("AccessControl");
      await treasury.connect(deployer).activateCircuitBreaker();
      expect(await treasury.circuitPaused()).to.equal(true);
      await treasury.connect(deployer).deactivateCircuitBreaker();
      expect(await treasury.circuitPaused()).to.equal(false);
    });
    it("Only DAO can set guardian", async function () {
      await expect(
        treasury.connect(signer2).setGuardian(aiGuardian.address)
      ).to.be.revertedWith("AccessControl");
      await expect(
        treasury.connect(deployer).setGuardian(aiGuardian.address)
      ).to.emit(treasury, "GuardianUpdated");
    });
  });

  describe("Security, Edge-case, Gas", function () {
    it("Should revert on propose/approve with zero address", async function () {
      await expect(
        treasury.connect(deployer).proposeTransfer(ethers.constants.AddressZero, 10)
      ).to.be.revertedWith("Invalid address");
    });
    it("Should revert if AI Guardian blocks transfer", async function () {
      await aiGuardian.setBlock(signer3.address, true);
      await expect(
        treasury.connect(deployer).proposeTransfer(signer3.address, ethers.utils.parseEther("10"))
      ).to.be.revertedWith("AI: Transfer blocked");
    });
    it("Gas for proposeTransfer < 90k", async function () {
      const tx = await treasury.connect(deployer).proposeTransfer(signer2.address, ethers.utils.parseEther("5"));
      const receipt = await tx.wait();
      expect(receipt.gasUsed.toNumber()).to.be.lessThan(90000, "Gas too high for proposeTransfer");
    });
  });
});

// ---- MockAIGuardian.sol ----
// Place this in contracts/MockAIGuardian.sol
/*
pragma solidity ^0.8.30;
contract MockAIGuardian {
    mapping(address => bool) public blocked;
    function setBlock(address who, bool blockIt) external { blocked[who] = blockIt; }
    function verifyTransfer(address to, uint256) external view returns (bool) {
        return !blocked[to];
    }
    function scoreTransfer(address, uint256) external pure returns (uint8) {
        return 50;
    }
}
*/
}