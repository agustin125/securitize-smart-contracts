import { ethers } from "hardhat";
import assert from "assert";

describe("Marketplace Tests", function () {
  let marketplace: any;
  let token: any;
  let deployer: any;
  let seller: any;
  let buyer: any;

  beforeEach(async () => {
    [deployer, seller, buyer] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    token = await TokenFactory.deploy("TestToken", "TTK", 1000);
    await token.deployed();

    await token.transfer(seller.address, 500);

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy();
    await marketplace.deployed();
  });

  it("Should allow users to list items for sale", async function () {
    const listAmount = 100;
    const price = ethers.utils.parseEther("1");

    const sellerBalance = await token.balanceOf(seller.address);
    assert.strictEqual(sellerBalance.toString(), "500", "Seller balance mismatch");

    await token.connect(seller).approve(marketplace.address, listAmount);
    await marketplace.connect(seller).listItem(token.address, listAmount, price);

    const listing = await marketplace.listings(0);
    assert.strictEqual(listing.seller, seller.address, "Seller address mismatch");
    assert.strictEqual(listing.token, token.address, "Token address mismatch");
    assert.strictEqual(listing.amount.toString(), listAmount.toString(), "Amount mismatch");
    assert.strictEqual(listing.price.toString(), price.toString(), "Price mismatch");
  });

  it("Should allow users to purchase listed items", async function () {
    const listAmount = 100;
    const price = ethers.utils.parseEther("1");

    await token.connect(seller).approve(marketplace.address, listAmount);
    await marketplace.connect(seller).listItem(token.address, listAmount, price);

    await marketplace.connect(buyer).purchaseItem(0, { value: price });

    const buyerBalance = await token.balanceOf(buyer.address);
    assert.strictEqual(buyerBalance.toString(), listAmount.toString(), "Buyer balance mismatch");

    const sellerEarnings = await marketplace.earnings(seller.address);
    assert.strictEqual(sellerEarnings.toString(), price.toString(), "Seller earnings mismatch");
  });

  it("Should allow sellers to withdraw earnings", async function () {
    const listAmount = 100;
    const price = ethers.utils.parseEther("1");

    await token.connect(seller).approve(marketplace.address, listAmount);
    await marketplace.connect(seller).listItem(token.address, listAmount, price);
    await marketplace.connect(buyer).purchaseItem(0, { value: price });

    const initialBalance = await ethers.provider.getBalance(seller.address);

    const tx = await marketplace.connect(seller).withdrawFunds();
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const finalBalance = await ethers.provider.getBalance(seller.address);

    assert.strictEqual(
      finalBalance.toString(),
      initialBalance.add(price).sub(gasUsed).toString(),
      "Final balance mismatch"
    );
  });
});
