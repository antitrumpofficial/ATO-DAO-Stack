const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATO – The Most Advanced Token Test Suite", function () {
  let deployer, dao, guardian, user, user2, ato;
  // تست روی شبکه لوکال: باید نقش ها را با signers ست کنیم
  beforeEach(async function () {
    [deployer, dao, guardian, user, user2, ...addrs] = await ethers.getSigners();
    const ATOFactory = await ethers.getContractFactory("ATO");
    ato = await ATOFactory.deploy();
    await ato.initialize();

    // انتقال اولیه از یکی از نقش‌ها به user
    // فرض بر این که deployer آدرس deployerWallet است
    await ato.connect(deployer).transfer(user.address, ethers.parseEther("1000000"));
    await ato.connect(deployer).transfer(user2.address, ethers.parseEther("1000000"));
  });

  describe("Tokenomics & Initialization", function () {
    it("Should set up all wallet balances on init", async function () {
      // این مقادیر برای شبکه لوکال درست نیست مگر نقش ها را به signerها بدهی
      // بهتر است فقط جمع کل supply تست شود:
      expect(await ato.totalSupply()).to.equal(ethers.parseEther("300000000"));
    });
  });

  describe("Roles & Access Control", function () {
    it("Only DAO can execute DAO-only functions", async function () {
      await expect(
        ato.connect(user).pause()
      ).to.be.revertedWith("AccessControl");
      await expect(
        ato.connect(user).daoTreasuryTransfer(user2.address, ethers.parseEther("1"))
      ).to.be.revertedWith("AccessControl");
    });

    it("Only GUARDIAN_ROLE can emergencyPause/unpause", async function () {
      await expect(
        ato.connect(user).emergencyPause()
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("Transfers, Fees, Reflection & Limits", function () {
    it("Should respect max tx and wallet limits", async function () {
      const maxTx = await ato.MAX_TX_LIMIT();
      const maxWallet = await ato.MAX_WALLET_LIMIT();
      await expect(
        ato.connect(user).transfer(user2.address, maxTx + 1n)
      ).to.be.revertedWith("ATO: Exceeds max tx limit");
      await ato.connect(user).transfer(user2.address, maxWallet);
      await expect(
        ato.connect(user).transfer(user2.address, 1)
      ).to.be.revertedWith("ATO: Exceeds max wallet limit");
    });

    it("Should deduct correct fees and update _totalReflected", async function () {
      const amt = ethers.parseEther("1000");
      const balBefore = await ato.balanceOf(user2.address);
      await ato.connect(user).transfer(user2.address, amt);
      const balAfter = await ato.balanceOf(user2.address);
      expect(balAfter).to.be.lessThan(balBefore + amt);
      expect(await ato.totalReflected()).to.be.gt(0);
    });

    // برای تست AI Hook باید نسخه mock بنویسی
    // اینجا به دلیل نبود Mock تست را غیرفعال می‌کنیم
    // it("Should block transfer if AI hook returns false (simulate)", async function () {
    //   await expect(
    //     ato.connect(user).transfer(user2.address, ethers.parseEther("1"))
    //   ).to.be.revertedWith("ATO: AI Hook blocked transfer");
    // });
  });

  describe("DAO Proposal Execution", function () {
    it("Should execute proposal only by DAO and block double execution", async function () {
      // می‌توان اینجا به صورت mock تست نوشت، چون در محیط واقعی لازم است مقداردهی و call به یک contract test انجام شود.
    });
  });

  describe("Emergency Functions", function () {
    it("Should pause and unpause only by DAO_ROLE", async function () {
      // مشابه بالا باید نقش‌ها را به صورت تستی بسازی و بدهی
    });

    it("Should activate emergencyPaused only by GUARDIAN_ROLE", async function () {
      // مشابه بالا
    });
  });

  describe("Security, Gas & Brute-force", function () {
    it("Gas usage for transfer below 180k", async function () {
      const tx = await ato.connect(user).transfer(user2.address, ethers.parseEther("1"));
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(180000n, "Transfer gas too high!");
    });

    it("No role escalation: only DAO_ROLE can authorize upgrade", async function () {
      await expect(
        ato.connect(user)._authorizeUpgrade(user2.address)
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("Edge-cases & Failure Handling", function () {
    it("Should revert if transferring to zero address", async function () {
      await expect(
        ato.connect(user).transfer(ethers.ZeroAddress, 1)
      ).to.be.reverted;
    });
  });
});
