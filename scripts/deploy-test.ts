import { ethers } from "hardhat";

async function main() {
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.deployed();

  console.log("Marketplace deployed to:", marketplace.address);

  await ERC20forTesting();

  }

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


async function ERC20forTesting() {
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const deployAmount = ethers.BigNumber.from(100000).mul(ethers.BigNumber.from(10).pow(18));
  const eRC20Mock = await ERC20Mock.deploy("TestToken", "TTK", deployAmount);
  await eRC20Mock.deployed();

  const amount = ethers.BigNumber.from(10000).mul(ethers.BigNumber.from(10).pow(18));
  await eRC20Mock.transfer("0x976EA74026E726554dB657fA54763abd0C3a0aa9", amount);
  await eRC20Mock.transfer("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", amount);
  await eRC20Mock.transfer("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", amount);

  console.log("ERC20Mock deployed to:", eRC20Mock.address);
}
