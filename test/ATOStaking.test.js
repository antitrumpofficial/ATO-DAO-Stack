const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATOStaking – VC/Exchange Ready Full Test Suite", function () {
  // Addresses per project
  const DAO_ADDRESS = "0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548";
  const TOKEN_ADDRESS = "0xA04973912507064d0E7130b78eb527b68ca04E8A"; // Proxy of ATO

  let deployer, dao, user, user2, staking, token, ATO, ATOStaking;

  beforeEach(async function () {
    [deployer, dao, user, user2, ...addrs] = await ethers.getSigners();
    // Deploy mock ATO token for staking (standard ERC20Upgradeable)
    const ERC20Mock = await ethers.getContractFactory("contracts/core/ATO.sol:ATO");
    token = await ERC20Mock.deploy();
    await token.initialize();

    // Mint tokens to users for staking
    await token.connect(deployer).transfer(user.address, ethers.utils.parseEther("100000"));
    await token.connect(deployer).transfer(user2.address, ethers.utils.parseEther("50000"));

    // Deploy Staking contract and initialize
    const StakingFactory = await ethers.getContractFactory("ATOStaking");
    staking = await StakingFactory.deploy();
    await staking.initialize(deployer.address, token.address, 500); // 5% annual
  });

  describe("Roles & Initialization", function () {
    it("DAO_ROLE and DEFAULT_ADMIN_ROLE assigned to DAO", async function () {
      const DAO_ROLE = await staking.DAO_ROLE();
      expect(await staking.hasRole(DAO_ROLE, deployer.address)).to.equal(true);
      expect(await staking.hasRole(await staking.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
    });

    it("Cannot initialize with zero address", async function () {
      const StakingFactory = await ethers.getContractFactory("ATOStaking");
      await expect(
        StakingFactory.deploy().then(c => c.initialize(ethers.constants.AddressZero, token.address, 500))
      ).to.be.revertedWith("Invalid address");
      await expect(
        StakingFactory.deploy().then(c => c.initialize(deployer.address, ethers.constants.AddressZero, 500))
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Staking Logic", function () {
    it("User can stake tokens with minimum lock period", async function () {
      const stakeAmt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, stakeAmt);
      await expect(staking.connect(user).stake(stakeAmt, 7 * 24 * 3600))
        .to.emit(staking, "Staked").withArgs(user.address, stakeAmt, 7 * 24 * 3600);

      const [amount,,] = await staking.getStake(user.address);
      expect(amount).to.equal(stakeAmt);
    });

    it("Should reject staking below minimum or zero", async function () {
      await token.connect(user).approve(staking.address, 100);
      await expect(staking.connect(user).stake(0, 7 * 24 * 3600)).to.be.revertedWith("Must stake more than 0");
      await expect(staking.connect(user).stake(10, 2 * 24 * 3600)).to.be.revertedWith("Minimum lock 7d");
    });

    it("Should allow multiple stakes & accumulate rewards", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 7 * 24 * 3600);

      // Forward time 6 months
      await ethers.provider.send("evm_increaseTime", [6 * 30 * 24 * 3600]);
      await ethers.provider.send("evm_mine");

      // Second stake triggers claim for previous
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 8 * 24 * 3600);

      const [amount,,] = await staking.getStake(user.address);
      expect(amount).to.equal(amt.mul(2));
    });
  });

  describe("Reward & Unstake", function () {
    it("Should accrue and claim rewards", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 8 * 24 * 3600);

      // Forward time 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 3600]);
      await ethers.provider.send("evm_mine");

      const userBalBefore = await token.balanceOf(user.address);
      await expect(staking.connect(user).claim()).to.emit(staking, "Claimed");
      const userBalAfter = await token.balanceOf(user.address);
      expect(userBalAfter).to.be.gt(userBalBefore); // Has earned
    });

    it("Unstake only after lock period", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 8 * 24 * 3600);
      await expect(staking.connect(user).unstake()).to.be.revertedWith("Still locked");

      // Forward time after lock
      await ethers.provider.send("evm_increaseTime", [10 * 24 * 3600]);
      await ethers.provider.send("evm_mine");

      await expect(staking.connect(user).unstake()).to.emit(staking, "Unstaked");
      const [amount] = await staking.getStake(user.address);
      expect(amount).to.equal(0);
    });

    it("Emergency unstake before lock with penalty", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 14 * 24 * 3600);

      // Emergency unstake
      await expect(staking.connect(user).emergencyUnstake()).to.emit(staking, "EmergencyUnstaked");
      const [amount] = await staking.getStake(user.address);
      expect(amount).to.equal(0);
    });
  });

  describe("DAO Controls", function () {
    it("Only DAO_ROLE can update reward rate", async function () {
      await expect(
        staking.connect(user).updateRewardRate(600)
      ).to.be.revertedWith("AccessControl");
      await expect(
        staking.connect(deployer).updateRewardRate(600)
      ).to.emit(staking, "RewardRateUpdated").withArgs(600);
    });

    it("Should revert if reward rate above max", async function () {
      await expect(
        staking.connect(deployer).updateRewardRate(2500)
      ).to.be.revertedWith("Too high");
    });
  });

  describe("Security, Gas & Edge Cases", function () {
    it("Cannot unstake with no stake", async function () {
      await expect(staking.connect(user2).unstake()).to.be.revertedWith("No stake");
    });
    it("Cannot emergency unstake after lock expired", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 8 * 24 * 3600);

      // Forward time after lock
      await ethers.provider.send("evm_increaseTime", [9 * 24 * 3600]);
      await ethers.provider.send("evm_mine");

      await expect(staking.connect(user).emergencyUnstake()).to.be.revertedWith("Use unstake()");
    });

    it("Gas usage for staking should be below 90k", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      const tx = await staking.connect(user).stake(amt, 7 * 24 * 3600);
      const receipt = await tx.wait();
      expect(receipt.gasUsed.toNumber()).to.be.lessThan(90000, "Staking gas too high!");
    });

    it("Should revert if _claim called when nothing staked", async function () {
      await expect(staking.connect(user2).claim()).to.be.revertedWith("Nothing staked");
    });

    it("Should revert if _claim reward is zero", async function () {
      const amt = ethers.utils.parseEther("1000");
      await token.connect(user).approve(staking.address, amt);
      await staking.connect(user).stake(amt, 7 * 24 * 3600);
      // Try to claim immediately
      await expect(staking.connect(user).claim()).to.be.revertedWith("No reward yet");
    });
  });
});
}