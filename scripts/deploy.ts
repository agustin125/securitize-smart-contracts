import { ethers } from "hardhat";

async function main() {
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.deployed();

  console.log("Marketplace deployed to:", marketplace.address);
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const eRC20Mock = await ERC20Mock.deploy("TestToken", "TTK", 1000000);
  await eRC20Mock.deployed();
  
  await eRC20Mock.transfer("0x976EA74026E726554dB657fA54763abd0C3a0aa9", 10000);
  console.log("ERC20Mock deployed to:", eRC20Mock.address);

  }

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
