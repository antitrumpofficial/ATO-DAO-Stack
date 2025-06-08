const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ATOCivicNFT – NFT Proof-of-Impact & Civic Identity Layer (VC/Exchange Ready)", function () {
  let dao, other, user1, user2, nft, NFTFactory;
  const DAO_ADDRESS = "0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548";

  beforeEach(async function () {
    [dao, other, user1, user2] = await ethers.getSigners();
    NFTFactory = await ethers.getContractFactory("ATOCivicNFT");
    nft = await NFTFactory.deploy();
    await nft.initialize(dao.address);
  });

  describe("Roles & Initialization", function () {
    it("Should assign DEFAULT_ADMIN_ROLE & DAO_ROLE to DAO address", async function () {
      expect(await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), dao.address)).to.equal(true);
      expect(await nft.hasRole(await nft.DAO_ROLE(), dao.address)).to.equal(true);
    });

    it("Should not allow non-DAO to mint or upgrade", async function () {
      await expect(
        nft.connect(other).issueNFT(user1.address, "DAO_VOTE", "ipfs://xxx")
      ).to.be.revertedWith("AccessControl");
      await expect(
        nft.connect(other)._authorizeUpgrade(user1.address)
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("Minting & Metadata", function () {
    it("DAO can mint new NFT and event emits", async function () {
      const tx = await nft.connect(dao).issueNFT(user1.address, "CIVIC_ACTION", "ipfs://nft1");
      await expect(tx)
        .to.emit(nft, "CivicNFTIssued")
        .withArgs(user1.address, 1, "CIVIC_ACTION");
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      const [cat, ts] = await nft.getProof(1);
      expect(cat).to.equal("CIVIC_ACTION");
      expect(ts).to.be.a("bigint");
    });

    it("Mint should revert to zero address", async function () {
      await expect(
        nft.connect(dao).issueNFT(ethers.ZeroAddress, "DAO_VOTE", "ipfs://fail")
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Burn & Ownership", function () {
    beforeEach(async function () {
      await nft.connect(dao).issueNFT(user1.address, "NGO_DONATION", "ipfs://uri2");
    });

    it("NFT owner can burn their token and event emits", async function () {
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      await expect(nft.connect(user1).burn(1))
        .to.emit(nft, "CivicNFTBurned")
        .withArgs(1);
      await expect(nft.ownerOf(1)).to.be.reverted; // Token should not exist after burn
    });

    it("Should not allow non-owner to burn", async function () {
      await expect(
        nft.connect(user2).burn(1)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Override/Security", function () {
    it("supportsInterface returns correct value for ERC721 and AccessControl", async function () {
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true); // ERC721
      expect(await nft.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
    });

    it("Override _isApprovedOrOwner works (override logic)", async function () {
      await nft.connect(dao).issueNFT(user1.address, "CIVIC_ACTION", "ipfs://nft1");
      expect(await nft.connect(user1)._isApprovedOrOwner(user1.address, 1)).to.equal(true);
      expect(await nft.connect(user1)._isApprovedOrOwner(user2.address, 1)).to.equal(false);
    });
  });

  describe("Edge-cases & Failures", function () {
    it("Burn non-existent token should revert", async function () {
      await expect(nft.connect(user1).burn(999)).to.be.reverted;
    });

    it("Mint multiple, check tokenIds increment", async function () {
      await nft.connect(dao).issueNFT(user1.address, "A", "u1");
      await nft.connect(dao).issueNFT(user2.address, "B", "u2");
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      expect(await nft.ownerOf(2)).to.equal(user2.address);
    });
  });
});
