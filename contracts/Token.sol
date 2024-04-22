// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

// TokenModule#Token - Sepolia - 0xd848E655EC68150114f9f5b9aD1a6a73c087ff9A
// TokenModule#Token - Sepolia - 0x3695C4Ae1B36d41DDc2BeE55BaA7c4e18cDd1437

import "hardhat/console.sol";

contract Token {
    string public name;
    string public symbol;
    uint256 public decimals = 18;

    // The fixed amount of tokens, stored in an unsigned integer type variable.
    uint256 public totalSupply;

    address owner;

    mapping(address => uint256) balances;

    mapping(address => mapping(address => uint256)) allowedSpenders;

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply * (10 ** decimals);
        balances[msg.sender] = totalSupply;
        owner = msg.sender;
    }

    function transfer(
        address to,
        uint256 amount
    ) external returns (bool success) {
        _transfer(msg.sender, to, amount);

        return true;
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool success) {
        require(_to != address(0));
        require(balances[_from] >= _value, "Not enough tokens");

        // console.log("Transferring from %s to %s %s tokens", _from, _to, _value);

        balances[_from] -= _value;
        balances[_to] += _value;

        emit Transfer(_from, _to, _value);

        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool success) {
        require(_value <= allowedSpenders[_from][msg.sender]);

        _transfer(_from, _to, _value);

        allowedSpenders[_from][msg.sender] = allowedSpenders[_from][
            msg.sender
        ] -= _value;

        return true;
    }

    function approve(
        address _spender,
        uint256 _value
    ) public returns (bool success) {
        require(_spender != address(0));

        allowedSpenders[msg.sender][_spender] = _value;

        emit Approval(msg.sender, _spender, _value);

        return true;
    }

    function allowance(
        address _owner,
        address _spender
    ) public view returns (uint256 remaining) {
        return allowedSpenders[_owner][_spender];
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}
