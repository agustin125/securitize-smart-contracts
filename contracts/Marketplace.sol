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
    uint256 public listingIdCounter;

    event ItemListed(uint256 indexed listingId, address indexed seller, address indexed token, uint256 amount, uint256 price);
    event ItemPurchased(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 price);
    event FundsWithdrawn(address indexed seller, uint256 amount);

    bytes32 private constant _TRANSFER_TYPEHASH = keccak256("Transfer(address token,address from,address to,uint256 amount,uint256 nonce)");

    mapping(address => uint256) public nonces;

    constructor() EIP712("Marketplace", "1") {}

    function listItem(address token, uint256 amount, uint256 price) external {
        require(amount > 0, "Amount must be greater than zero");
        require(price > 0, "Price must be greater than zero");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        listings[listingIdCounter] = Listing({
            seller: msg.sender,
            token: token,
            amount: amount,
            price: price
        });

        emit ItemListed(listingIdCounter, msg.sender, token, amount, price);
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

    function transferWithSignature(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external {
        bytes32 structHash = keccak256(
            abi.encode(
                _TRANSFER_TYPEHASH,
                token,
                from,
                to,
                amount,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        require(signer == from, "Invalid signature");
        require(nonce == nonces[from], "Invalid nonce");

        nonces[from]++;
        IERC20(token).transferFrom(from, to, amount);
    }
}