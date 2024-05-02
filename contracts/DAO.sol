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
        uint256 forVotes;
        uint256 againstVotes;
        bool finalized;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public voted;
    mapping(uint256 => uint256) public proposalCreationTime;

    event Propose(
        uint256 indexed id,
        string name,
        uint256 amount,
        address indexed recipient,
        address indexed creator
    );
    event Vote(
        uint256 indexed id,
        address indexed voter,
        bool support,
        uint256 votes
    );
    event Finalize(uint256 indexed id, uint256 forVotes, uint256 againstVotes);

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, "DAO: must be token holder");
        _;
    }

    modifier notFinalized(uint256 _proposalId) {
        require(
            !proposals[_proposalId].finalized,
            "DAO: proposal already finalized"
        );
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
            bytes(_name).length > 0,
            "DAO: proposal must have a description"
        );
        proposals[++proposalCount] = Proposal(
            proposalCount,
            _name,
            _amount,
            _recipient,
            0, // forVotes initialized to zero
            0, // againstVotes initialized to zero
            false
        );
        proposalCreationTime[proposalCount] = block.timestamp;
        emit Propose(proposalCount, _name, _amount, _recipient, msg.sender);
    }

    function vote(
        uint256 _proposalId,
        bool _support
    ) external onlyInvestor notFinalized(_proposalId) {
        require(!voted[msg.sender][_proposalId], "DAO: already voted");

        Proposal storage proposal = proposals[_proposalId];
        uint256 voterBalance = token.balanceOf(msg.sender);
        require(
            block.timestamp >= proposalCreationTime[_proposalId],
            "DAO: voting before proposal creation"
        );

        if (_support) {
            proposal.forVotes += voterBalance;
        } else {
            proposal.againstVotes += voterBalance;
        }
        voted[msg.sender][_proposalId] = true;

        emit Vote(_proposalId, msg.sender, _support, voterBalance);
    }

    function finalizeProposal(
        uint256 _proposalId
    ) external onlyInvestor notFinalized(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        require(totalVotes >= quorum, "DAO: must reach quorum to finalize");
        require(
            proposal.forVotes > proposal.againstVotes,
            "DAO: more against votes than for votes"
        );
        require(
            address(this).balance >= proposal.amount,
            "DAO: insufficient balance to finalize"
        );

        proposal.finalized = true;
        (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");
        require(sent, "DAO: failed to send Ether");

        emit Finalize(_proposalId, proposal.forVotes, proposal.againstVotes);
    }

    function hasVoted(
        address _voter,
        uint256 _proposalId
    ) external view returns (bool) {
        return voted[_voter][_proposalId];
    }

    receive() external payable {}
}
