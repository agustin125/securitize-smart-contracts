// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Marketplace is EIP712 {
    using ECDSA for bytes32;

    struct Listing {
        address seller;
        address token;
        uint256 amount;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public earnings;
    mapping(address => uint256) public nonces;
    uint256 public listingIdCounter;

    event ItemListed(uint256 indexed listingId, address indexed seller, address indexed token, uint256 amount, uint256 price);
    event ItemPurchased(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 price);
    event FundsWithdrawn(address indexed seller, uint256 amount);

    bytes32 private constant _LIST_ITEM_TYPEHASH = keccak256(
        "ListItem(address token,uint256 amount,uint256 price,uint256 nonce,address seller)"
    );

    constructor() EIP712("Marketplace", "1") {}

    function listItem(
        address token,
        uint256 amount,
        uint256 price,
        uint256 nonce,
        bytes memory signature
    ) external {
        require(amount > 0, "Amount must be greater than zero");
        require(price > 0, "Price must be greater than zero");

        address seller;

        if (signature.length > 0) {
            // Recover signer from signature
            bytes32 structHash = keccak256(
                abi.encode(
                    _LIST_ITEM_TYPEHASH,
                    token,
                    amount,
                    price,
                    nonce,
                    msg.sender
                )
            );

            bytes32 digest = _hashTypedDataV4(structHash);
            seller = digest.recover(signature);

            require(seller != address(0), "Invalid signature");
            require(nonce == nonces[seller], "Invalid nonce");

            nonces[seller]++;
        } else {
            seller = msg.sender;
        }

        require(seller == msg.sender || IERC20(token).allowance(seller, address(this)) >= amount, "Insufficient allowance");

        if (seller != msg.sender) {
            IERC20(token).transferFrom(seller, address(this), amount);
        } else {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        listings[listingIdCounter] = Listing({
            seller: seller,
            token: token,
            amount: amount,
            price: price
        });

        emit ItemListed(listingIdCounter, seller, token, amount, price);
        listingIdCounter++;
    }

    function purchaseItem(uint256 listingId) external payable {
        Listing memory listing = listings[listingId];

        require(listing.amount > 0, "Listing does not exist");
        require(msg.value == listing.price, "Incorrect Ether value");

        IERC20(listing.token).transfer(msg.sender, listing.amount);
        earnings[listing.seller] += msg.value;

        delete listings[listingId];

        emit ItemPurchased(listingId, msg.sender, listing.amount, listing.price);
    }

    function withdrawFunds() external {
        uint256 amount = earnings[msg.sender];
        require(amount > 0, "No funds to withdraw");

        earnings[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit FundsWithdrawn(msg.sender, amount);
    }
}
