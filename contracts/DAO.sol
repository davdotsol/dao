// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

// TokenModule#Token - Sepolia - 0x3695C4Ae1B36d41DDc2BeE55BaA7c4e18cDd1437

import "hardhat/console.sol";
import "./Token.sol";

contract DAO {
    address public owner;
    Token public token;
    uint256 public quorum;

    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        uint256 votes;
        bool finalized;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public voted;

    event Propose(
        uint256 indexed id,
        string name,
        uint256 amount,
        address indexed recipient,
        address indexed creator
    );
    event Vote(uint256 indexed id, address indexed voter, uint256 votes);
    event Finalize(uint256 indexed id, uint256 votes);

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, "DAO: must be token holder");
        _;
    }

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient
    ) external onlyInvestor {
        require(
            address(this).balance >= _amount,
            "DAO: insufficient balance for proposal"
        );

        proposals[++proposalCount] = Proposal(
            proposalCount,
            _name,
            _amount,
            _recipient,
            0,
            false
        );
        emit Propose(proposalCount, _name, _amount, _recipient, msg.sender);
    }

    function vote(uint256 _proposalId) external onlyInvestor {
        require(!voted[msg.sender][_proposalId], "DAO: already voted");
        Proposal storage proposal = proposals[_proposalId];
        uint256 voterBalance = token.balanceOf(msg.sender);

        proposal.votes += voterBalance;
        voted[msg.sender][_proposalId] = true;

        emit Vote(_proposalId, msg.sender, voterBalance);
    }

    function finalizeProposal(uint256 _proposalId) external onlyInvestor {
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.finalized, "DAO: proposal already finalized");
        require(proposal.votes >= quorum, "DAO: must reach quorum to finalize");
        require(
            address(this).balance >= proposal.amount,
            "DAO: insufficient balance to finalize"
        );

        proposal.finalized = true;
        (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");
        require(sent, "DAO: failed to send Ether");

        emit Finalize(_proposalId, proposal.votes);
    }

    receive() external payable {}
}
