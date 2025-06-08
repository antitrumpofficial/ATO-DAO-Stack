// ATOArbitrationCouncil.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATOArbitrationCouncil (Upgradeable)", function () {
  let Arbitration, arbitration, proxy, owner, dao, council, user, reported, aiResolverMock, resolver;
  const REASON = "This is a valid dispute reason about governance attack!";
  const MIN_REASON = "Short";

  beforeEach(async function () {
    [owner, dao, council, user, reported, other] = await ethers.getSigners();

    // 1. Deploy a mock AI Resolver
    const AIResolverMock = await ethers.getContractFactory("MockAIResolver");
    aiResolverMock = await AIResolverMock.deploy();
    await aiResolverMock.deployed();

    // 2. Deploy Arbitration contract as upgradeable (UUPS)
    Arbitration = await ethers.getContractFactory("ATOArbitrationCouncil");
    proxy = await upgrades.deployProxy(
      Arbitration,
      [dao.address, aiResolverMock.address],
      { initializer: "initialize", kind: "uups" }
    );
    arbitration = Arbitration.attach(proxy.address);

    // Assign COUNCIL_ROLE to council address if needed (by default in initialize)
  });

  it("DAO & Council roles are set correctly", async function () {
    expect(await arbitration.hasRole(await arbitration.DAO_ROLE(), dao.address)).to.be.true;
    expect(await arbitration.hasRole(await arbitration.COUNCIL_ROLE(), dao.address)).to.be.true;
    // Council can also be set as separate account if needed
  });

  it("Should revert if dispute reason too short", async function () {
    await expect(
      arbitration.connect(user).fileDispute(reported.address, MIN_REASON)
    ).to.be.revertedWith("Reason too short");
  });

  it("Should revert if reported is zero address", async function () {
    await expect(
      arbitration.connect(user).fileDispute(ethers.constants.AddressZero, REASON)
    ).to.be.revertedWith("Invalid reported");
  });

  it("Should file a new dispute and emit event", async function () {
    const tx = await arbitration.connect(user).fileDispute(reported.address, REASON);
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "DisputeFiled");
    expect(event.args.reporter).to.equal(user.address);
    expect(event.args.reported).to.equal(reported.address);
    expect(event.args.reason).to.equal(REASON);
  });

  it("Should not file duplicate dispute", async function () {
    await arbitration.connect(user).fileDispute(reported.address, REASON);
    await expect(
      arbitration.connect(user).fileDispute(reported.address, REASON)
    ).to.be.revertedWith("Already filed");
  });

  it("AIResolver riskScore must be called on fileDispute", async function () {
    // We check that riskScore is invoked, with event in the mock
    await expect(arbitration.connect(user).fileDispute(reported.address, REASON))
      .to.emit(aiResolverMock, "RiskScoreQueried")
      .withArgs(reported.address);
  });

  it("Only council can resolve dispute", async function () {
    const tx = await arbitration.connect(user).fileDispute(reported.address, REASON);
    const receipt = await tx.wait();
    const disputeId = receipt.events.find(e => e.event === "DisputeFiled").args.id;

    await expect(
      arbitration.connect(user).resolveDispute(disputeId, true)
    ).to.be.revertedWith("AccessControl: account");

    // Now as council (dao in this setup)
    await expect(
      arbitration.connect(dao).resolveDispute(disputeId, true)
    ).to.emit(arbitration, "DisputeResolved")
      .withArgs(disputeId, true);
  });

  it("Dispute can't be resolved twice", async function () {
    const tx = await arbitration.connect(user).fileDispute(reported.address, REASON);
    const receipt = await tx.wait();
    const disputeId = receipt.events.find(e => e.event === "DisputeFiled").args.id;

    await arbitration.connect(dao).resolveDispute(disputeId, true);
    await expect(
      arbitration.connect(dao).resolveDispute(disputeId, false)
    ).to.be.revertedWith("Already handled");
  });

  it("Anyone can get dispute info and list", async function () {
    const tx = await arbitration.connect(user).fileDispute(reported.address, REASON);
    const receipt = await tx.wait();
    const disputeId = receipt.events.find(e => e.event === "DisputeFiled").args.id;

    const dispute = await arbitration.getDispute(disputeId);
    expect(dispute.reporter).to.equal(user.address);
    expect(dispute.reported).to.equal(reported.address);
    expect(dispute.status).to.equal(0); // Open

    const ids = await arbitration.getDisputeIds();
    expect(ids.length).to.be.greaterThan(0);
    expect(ids[0]).to.equal(disputeId);
  });

  it("DAO can update AI Resolver", async function () {
    const NewResolver = await ethers.getContractFactory("MockAIResolver");
    const newResolver = await NewResolver.deploy();
    await newResolver.deployed();

    await expect(
      arbitration.connect(dao).updateAIResolver(newResolver.address)
    ).to.emit(arbitration, "AIResolverUpdated")
      .withArgs(newResolver.address);

    expect(await arbitration.aiResolver()).to.equal(newResolver.address);
  });

  it("Non-DAO cannot update AI Resolver", async function () {
    const NewResolver = await ethers.getContractFactory("MockAIResolver");
    const newResolver = await NewResolver.deploy();
    await expect(
      arbitration.connect(user).updateAIResolver(newResolver.address)
    ).to.be.revertedWith("AccessControl: account");
  });

  // Advanced: Gas cost (example)
  it("Gas: fileDispute should be efficient", async function () {
    const tx = await arbitration.connect(user).fileDispute(reported.address, REASON);
    const receipt = await tx.wait();
    expect(receipt.gasUsed.toNumber()).to.be.lessThan(250_000);
  });

  // Edge: Reentrancy/attack (as bonus if reentrancy is possible)
});

/// ---- MOCKS ----
/// Place this in a separate file or at top of test, it's a minimal AI Resolver for testing.
/// You can expand as needed for advanced/abuse scenarios.

const { Contract } = require("ethers");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");

async function deployAIResolverMock(signer) {
  // Inline Solidity for a basic mock
  const source = `
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.0;
  contract MockAIResolver {
    event RiskScoreQueried(address);
    function validateDispute(bytes32, address, address, string calldata) external pure returns (bool) { return true; }
    function riskScore(address reported) external returns (uint8) {
      emit RiskScoreQueried(reported);
      return 42;
    }
  }`;
  const factory = await ethers.getContractFactoryFromSolidity(source, signer);
  const contract = await factory.deploy();
  await contract.deployed();
  return contract;
}
}