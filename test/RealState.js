const { ethers } = require("hardhat");

describe("RealState", () => {
  let realState, escrow;
  beforeEach(async () => {
    // load contracts
    const RealState = await ethers.getContractFactory("RealState");
    const Escrow = await ethers.getContractFactory("Escrow");

    // deploy contracts
    realState = await RealState.deploy();
    escrow = await Escrow.deploy();
  });
});
