const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTMarketplace", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTMarketplace() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    // Get the NFTMarketplace smart contract object and deploy it
    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await Marketplace.deploy();

    return { marketplace, owner, otherAccount };
  }

  describe("Deployment", function () {
    describe("checking initial", function () {
      it("Should set the right owner", async function () {
        const { marketplace, owner } = await loadFixture(deployNFTMarketplace);

        expect(await marketplace.owner()).to.equal(owner.address);
      });

      it("Should get the correct list price", async function () {
        const { marketplace } = await loadFixture(deployNFTMarketplace);

        const listPrice = await marketplace.getListPrice();
        expect(listPrice.toString()).to.equal(
          ethers.utils.parseEther("0.01").toString()
        );
      });
      it("Should get the correct token", async function () {
        const { marketplace } = await loadFixture(deployNFTMarketplace);

        const tokenId = await marketplace.getCurrentToken();
        expect(tokenId.toString()).to.equal("0");
      });
    });

    describe("updateListPrice", function () {
      it("should allow owner to update list price", async function () {
        const { marketplace } = await loadFixture(deployNFTMarketplace);

        const newPrice = ethers.utils.parseEther("1");
        await marketplace.updateListPrice(newPrice);
        // .to.emit(marketplace, "log")
        // .withArgs(newPrice);
        expect(await marketplace.getListPrice()).to.equal(newPrice);
      });

      it("should revert if non-owner tries to update list price", async function () {
        const { marketplace, otherAccount } = await loadFixture(
          deployNFTMarketplace
        );

        const newPrice = ethers.utils.parseEther("1");
        await expect(
          marketplace.connect(otherAccount).updateListPrice(newPrice)
        ).to.be.revertedWith("Only owner can update listing price");
        expect(await marketplace.getListPrice()).to.not.equal(newPrice);
      });
    });
  });

  describe("createToken", function () {
    let tokenId, marketplace, owner, otherAccount;

    beforeEach(async () => {
      // load contracts
      [owner, otherAccount] = await ethers.getSigners();
      const Marketplace = await ethers.getContractFactory("NFTMarketplace");

      // deploy contracts
      marketplace = await Marketplace.deploy();
    });

    it("should create a new NFT and list it for sale", async function () {
      // const { marketplace, owner } = await loadFixture(deployNFTMarketplace);

      const tokenURI = "ipfs://QmT8ePYWyfssPdvpK2QcA1AGd8WkUv1bYpbmRzjzb6G8Wn";
      const price = ethers.utils.parseEther("1");
      const listPrice = await marketplace.listPrice();
      const expectedTokenId = 1;

      await expect(
        marketplace.createToken(tokenURI, price, { value: listPrice })
      )
        .to.emit(marketplace, "TokenListedSuccess")
        .withArgs(
          expectedTokenId,
          marketplace.address,
          owner.address,
          price,
          false
        );

      console.log("marketplace.address", marketplace.address);
      console.log("owner.address", owner.address);

      tokenId = await marketplace.getCurrentToken();
      expect(await marketplace.ownerOf(tokenId)).to.equal(marketplace.address);

      const listedToken = await marketplace.idToListedToken(tokenId);
      expect(listedToken.tokenId).to.equal(tokenId);
      expect(listedToken.seller).to.equal(owner.address);
      expect(listedToken.price).to.equal(price);
      expect(listedToken.currentlyListed).to.be.false;
    });

    it("should not allow creating NFT with negative price", async function () {
      // const { marketplace } = await loadFixture(deployNFTMarketplace);

      const tokenURI = "ipfs://QmT8ePYWyfssPdvpK2QcA1AGd8WkUv1bYpbmRzjzb6G8Wn";
      const price = ethers.utils.parseEther("0");
      const listPrice = await marketplace.listPrice();

      await expect(
        marketplace.createToken(tokenURI, price, { value: listPrice })
      ).to.be.revertedWith("Make sure the price isn't negative");
    });
    it("Should create, list and executeSale the sale and change the ownership", async () => {
      // const { marketplace, owner, otherAccount } = await loadFixture(
      //   deployNFTMarketplace
      // );

      const tokenURI = "ipfs:/s/gasdgsahgsdahasdhasdh";
      const price = ethers.utils.parseEther("0.01");
      const getListPrice = await marketplace.getListPrice();
      const expectedTokenId = 1;

      expect(
        await marketplace.createToken(tokenURI, price, { value: getListPrice })
      )
        .to.emit(marketplace, "TokenListedSuccess")
        .withArgs(
          expectedTokenId,
          marketplace.address,
          owner.address,
          price,
          false
        );

      const listTx = await marketplace.listToken(expectedTokenId, price);
      await listTx.wait(1);

      const tx = await marketplace
        .connect(otherAccount)
        .executeSale(expectedTokenId, {
          value: price,
        });

      await tx.wait(1);

      const allNfts = await marketplace.getListedTokenForId(tokenId);
      const otherAccountBalance = await ethers.provider.getBalance(
        otherAccount.address
      );
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      const marketplaceBalance = await ethers.provider.getBalance(
        marketplace.address
      );
      console.log({
        ownerBalance,
        otherAccountBalance,
        marketplaceBalance,
      });

      expect(allNfts.seller).to.equal(otherAccount.address);
    });
  });
});
