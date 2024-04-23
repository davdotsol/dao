// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

// TokenModule#Token - Sepolia - 0x3695C4Ae1B36d41DDc2BeE55BaA7c4e18cDd1437

import "hardhat/console.sol";
import "./Token.sol";

contract DAO {
    address owner;
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
    mapping(address => mapping(uint256 => bool)) public votes;

    event Propose(
        uint256 id,
        uint256 amount,
        address recipient,
        address creator
    );

    event Vote(uint256 id, address investor);
    event Finalize(uint256 id);

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive ether
    receive() external payable {}

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, "must be token holder");
        _;
    }

    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient
    ) external onlyInvestor {
        require(address(this).balance >= _amount);

        proposalCount++;
        // Create a Proposal
        // Ex1. Send 100 ETH to Tom
        // Ex2. Send 50 ETH to Jane for Website development
        // Ex3. Send 1 ETH to Julie for Marketing
        proposals[proposalCount] = Proposal(
            proposalCount,
            _name,
            _amount,
            _recipient,
            0,
            false
        );

        emit Propose(proposalCount, _amount, _recipient, msg.sender);
    }

    function vote(uint256 _proposalId) external onlyInvestor {
        // Don't let investors vote twice
        require(!votes[msg.sender][_proposalId], "Already voted");
        Proposal storage proposal = proposals[_proposalId];

        proposal.votes += token.balanceOf(msg.sender);

        votes[msg.sender][_proposalId] = true;

        emit Vote(_proposalId, msg.sender);
    }

    function finalizeProposal(uint256 _proposalId) external onlyInvestor {
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.finalized, "proposal already finalized");
        require(
            proposal.votes >= quorum,
            "must reach quorum to finalize proposal"
        );
        require(address(this).balance >= proposal.amount);
        proposal.finalized = true;
        (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");
        require(sent);
        emit Finalize(_proposalId);
    }
}
