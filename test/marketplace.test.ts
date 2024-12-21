import { ethers } from "hardhat";
import assert from "assert";
const NULL_ADDRESS = ethers.constants.AddressZero;

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

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy();
    await marketplace.deployed();
    await token.transfer(seller.address, 500);
  });

  it("Should allow users to list items for sale with a signature", async function () {
    const listAmount = 100;
    const price = ethers.utils.parseEther("1");
    const nonce = await marketplace.nonces(seller.address);

    const domain = {
        name: "Marketplace",
        version: "1",
        chainId: await deployer.getChainId(),
        verifyingContract: marketplace.address,
    };

    const types = {
        ListItem: [
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "price", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "signer", type: "address" },
        ],
    };

    const value = {
        token: token.address,
        amount: listAmount,
        price: price,
        nonce: nonce,
        signer: seller.address,
    };

    console.log(" seller.address",  seller.address);
    await token.connect(seller).approve(marketplace.address, listAmount);

    const signature = await seller._signTypedData(domain, types, value);
    const structHash = ethers.utils._TypedDataEncoder.hash(domain, types, value);
    console.log("Generated structHash:", structHash);

    await marketplace.listItem(token.address, listAmount, price, nonce, signature, seller.address);

    const listing = await marketplace.listings(0);
    assert.strictEqual(listing.seller, seller.address, "Seller address mismatch");
    assert.strictEqual(listing.token, token.address, "Token address mismatch");
    assert.strictEqual(listing.amount.toString(), listAmount.toString(), "Amount mismatch");
    assert.strictEqual(listing.price.toString(), price.toString(), "Price mismatch");
  });


  it("Should allow users to list items without a signature", async function () {
    const listAmount = 100;
    const price = ethers.utils.parseEther("1");

    await token.connect(seller).approve(marketplace.address, listAmount);
    await marketplace.connect(seller).listItem(token.address, listAmount, price, 0, "0x", NULL_ADDRESS);

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
    await marketplace.connect(seller).listItem(token.address, listAmount, price, 0, "0x", NULL_ADDRESS);

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
    await marketplace.connect(seller).listItem(token.address, listAmount, price, 0, "0x", NULL_ADDRESS);
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
