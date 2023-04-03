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

  describe("CreateAndBuyProcess", function () {
    let tokenId;

    it("Should create, list and executeSale the sale and change the ownership", async () => {
      const { marketplace, owner, otherAccount } = await loadFixture(
        deployNFTMarketplace
      );

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

      await expect(
        marketplace
          .connect(otherAccount)
          .executeSale(expectedTokenId, { value: price })
      ).to.be.revertedWith("This token is not currently listed for sale");

      await expect(
        marketplace.connect(otherAccount).listToken(expectedTokenId, price)
      ).to.be.revertedWith("You don't own this NFT");

      const listTokenTx = await marketplace.listToken(expectedTokenId, price);
      await listTokenTx.wait(1);

      const executeSaleTx = await marketplace
        .connect(otherAccount)
        .executeSale(expectedTokenId, { value: price });
      await executeSaleTx.wait(1);

      const listedToken = await marketplace.getListedTokenForId(
        expectedTokenId
      );

      expect(listedToken.seller).to.equal(otherAccount.address);

      await expect(
        marketplace.executeSale(expectedTokenId, { value: price })
      ).to.be.revertedWith("This token is not currently listed for sale");

      await expect(
        marketplace.listToken(expectedTokenId, price)
      ).to.be.revertedWith("You don't own this NFT");

      await (
        await marketplace
          .connect(otherAccount)
          .listToken(expectedTokenId, price)
      ).wait(1);

      await (
        await marketplace
          .connect(otherAccount)
          .executeSale(expectedTokenId, { value: price })
      ).wait(1);

      expect(listedToken.seller).to.equal(owner.address);

      const contractBalance = await ethers.provider.getBalance(
        marketplace.address
      );
      const ownerBalance = await ethers.provider.getBalance(
        marketplace.address
      );
      const otherBalance = await ethers.provider.getBalance(
        marketplace.address
      );

      console.log({ listedToken, contractBalance, ownerBalance, otherBalance });
    });
  });
});
