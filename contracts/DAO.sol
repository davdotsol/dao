// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

// TokenModule#Token - Sepolia - 0x3695C4Ae1B36d41DDc2BeE55BaA7c4e18cDd1437

import "hardhat/console.sol";
import "./Token.sol";

contract DAO {
    address owner;
    Token public token;
    uint256 public quorum;

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive ether
    receive() external payable {}
}
