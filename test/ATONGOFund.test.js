const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATONGOFund – DAO & NGO Integration Full Security Test Suite", function () {
  let deployer, dao, ngo, ngo2, user, token, fund, riskEngine, RiskEngineMock;
  const DAO_ROLE_NAME = "DAO_ROLE";

  beforeEach(async function () {
    [deployer, dao, ngo, ngo2, user] = await ethers.getSigners();
    // Mock ERC20 (ATO)
    const ERC20Mock = await ethers.getContractFactory("contracts/core/ATO.sol:ATO");
    token = await ERC20Mock.deploy();
    await token.initialize();
    await token.connect(deployer).transfer(deployer.address, ethers.utils.parseEther("100000"));

    // Deploy fund and initialize
    const FundFactory = await ethers.getContractFactory("ATONGOFund");
    fund = await FundFactory.deploy();
    await fund.initialize(deployer.address, token.address);

    // Fund the contract
    await token.connect(deployer).transfer(fund.address, ethers.utils.parseEther("50000"));

    // Mock risk engine
    RiskEngineMock = await ethers.getContractFactory("MockRiskEngine");
    riskEngine = await RiskEngineMock.deploy();
  });

  describe("Role & Initialization", function () {
    it("DAO_ROLE & DEFAULT_ADMIN_ROLE assigned", async function () {
      const DAO_ROLE = await fund.DAO_ROLE();
      expect(await fund.hasRole(DAO_ROLE, deployer.address)).to.be.true;
      expect(await fund.hasRole(await fund.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });
    it("Should not initialize with zero address", async function () {
      const FundFactory = await ethers.getContractFactory("ATONGOFund");
      await expect(
        FundFactory.deploy().then(f => f.initialize(ethers.constants.AddressZero, token.address))
      ).to.be.revertedWith("Invalid address");
      await expect(
        FundFactory.deploy().then(f => f.initialize(deployer.address, ethers.constants.AddressZero))
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("NGO Registration & Requests", function () {
    it("Only DAO_ROLE can register NGO", async function () {
      await expect(
        fund.connect(ngo).registerNGO(ngo.address, "NGO 1", "site.com")
      ).to.be.revertedWith("AccessControl");
      await expect(
        fund.connect(deployer).registerNGO(ngo.address, "NGO 1", "site.com")
      ).to.emit(fund, "NGORegistered").withArgs(ngo.address, "NGO 1");
      expect((await fund.ngos(ngo.address)).registered).to.be.true;
    });

    it("NGO can submit fund request if registered", async function () {
      await fund.connect(deployer).registerNGO(ngo.address, "NGO 1", "url");
      await expect(
        fund.connect(ngo).submitRequest("Build School", ethers.utils.parseEther("1000"))
      ).to.emit(fund, "RequestSubmitted");
      expect(await fund.getRequestCount()).to.equal(1);
    });

    it("Should reject request from unregistered NGO", async function () {
      await expect(
        fund.connect(ngo).submitRequest("No reg", ethers.utils.parseEther("1"))
      ).to.be.revertedWith("NGO not registered");
    });

    it("Should reject request if amount = 0", async function () {
      await fund.connect(deployer).registerNGO(ngo.address, "NGO", "w");
      await expect(
        fund.connect(ngo).submitRequest("Bad", 0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should emit risk score if risk engine exists", async function () {
      await fund.connect(deployer).registerNGO(ngo.address, "NGO", "url");
      await fund.connect(deployer).setRiskEngine(riskEngine.address);
      await riskEngine.setRiskScore(ngo.address, "HEALTH", ethers.utils.parseEther("777"), 42);

      const tx = await fund.connect(ngo).submitRequest("HEALTH", ethers.utils.parseEther("777"));
      const req = await fund.getRequest(0);
      expect(req.riskScore).to.equal(42);
    });
  });

  describe("DAO Approval & Disbursement", function () {
    beforeEach(async function () {
      await fund.connect(deployer).registerNGO(ngo.address, "NGO 1", "site.com");
      await fund.connect(deployer).registerNGO(ngo2.address, "NGO 2", "b.com");
      await fund.connect(ngo).submitRequest("Water", ethers.utils.parseEther("1000"));
      await fund.connect(ngo2).submitRequest("Food", ethers.utils.parseEther("2000"));
    });
    it("Only DAO_ROLE can approve/disburse funds", async function () {
      await expect(fund.connect(ngo).approveRequest(0)).to.be.revertedWith("AccessControl");
      await expect(fund.connect(deployer).approveRequest(0)).to.emit(fund, "RequestApproved");
      await expect(fund.connect(ngo).disburseFunds(0)).to.be.revertedWith("AccessControl");
    });

    it("DAO can approve and disburse for correct requests", async function () {
      await fund.connect(deployer).approveRequest(0);
      await expect(
        fund.connect(deployer).disburseFunds(0)
      ).to.emit(fund, "FundsDisbursed").withArgs(0, ngo.address, ethers.utils.parseEther("1000"));
      const req = await fund.getRequest(0);
      expect(req.executed).to.be.true;
      expect(await token.balanceOf(ngo.address)).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should not approve twice, or disburse unapproved/executed", async function () {
      await fund.connect(deployer).approveRequest(0);
      await expect(fund.connect(deployer).approveRequest(0)).to.be.revertedWith("Already approved");
      await expect(fund.connect(deployer).disburseFunds(1)).to.be.revertedWith("Not ready");
      await fund.connect(deployer).disburseFunds(0);
      await expect(fund.connect(deployer).disburseFunds(0)).to.be.revertedWith("Not ready");
    });

    it("Should revert if funds not enough", async function () {
      await fund.connect(deployer).approveRequest(1);
      // Drain token contract funds (simulate hack or error)
      await token.connect(deployer).transfer(user.address, await token.balanceOf(fund.address));
      await expect(
        fund.connect(deployer).disburseFunds(1)
      ).to.be.revertedWith("Insufficient funds");
    });
  });

  describe("Risk Engine & Admin Controls", function () {
    it("Only DAO_ROLE can set/update risk engine", async function () {
      await expect(
        fund.connect(ngo).setRiskEngine(riskEngine.address)
      ).to.be.revertedWith("AccessControl");
      await expect(
        fund.connect(deployer).setRiskEngine(riskEngine.address)
      ).to.emit(fund, "RiskEngineUpdated").withArgs(riskEngine.address);
    });
    it("Risk engine returns score in submitRequest", async function () {
      await fund.connect(deployer).registerNGO(ngo.address, "NGO 1", "civic");
      await fund.connect(deployer).setRiskEngine(riskEngine.address);
      await riskEngine.setRiskScore(ngo.address, "EDU", ethers.utils.parseEther("50"), 77);

      await fund.connect(ngo).submitRequest("EDU", ethers.utils.parseEther("50"));
      const req = await fund.getRequest(0);
      expect(req.riskScore).to.equal(77);
    });
  });

  describe("Edge-cases, Gas, Brute-force", function () {
    it("Should handle 20 requests and approvals in a row", async function () {
      await fund.connect(deployer).registerNGO(user.address, "NGO3", "ng3");
      for (let i = 0; i < 20; i++) {
        await fund.connect(user).submitRequest("R" + i, ethers.utils.parseEther("2"));
        await fund.connect(deployer).approveRequest(i + 2);
      }
      expect(await fund.getRequestCount()).to.equal(22);
    });
    it("Gas for registering NGO < 90k", async function () {
      const tx = await fund.connect(deployer).registerNGO(user.address, "NGOGAS", "ngogas.com");
      const receipt = await tx.wait();
      expect(receipt.gasUsed.toNumber()).to.be.lessThan(90000, "Gas too high for NGO registration!");
    });
  });
});

// ---- MockRiskEngine ----
// Place in contracts/MockRiskEngine.sol
/*
pragma solidity ^0.8.30;
contract MockRiskEngine {
    mapping(address => mapping(string => mapping(uint256 => uint8))) public customScores;
    function setRiskScore(address ngo, string calldata purpose, uint256 amount, uint8 score) external {
        customScores[ngo][purpose][amount] = score;
    }
    function scoreNGO(address ngo, string calldata purpose, uint256 amount) external view returns (uint8) {
        return customScores[ngo][purpose][amount];
    }
}
*/
}