const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (m) => {
  return ethers.parseUnits(m.toString(), 18);
};

describe('DAO contract', function () {
  async function deployDAOFixture() {
    const [
      owner,
      funder,
      investor1,
      investor2,
      investor3,
      investor4,
      investor5,
      recipient,
      user,
    ] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', '1000000');
    await ddsToken.waitForDeployment();

    // Send tokens to investors - each one gets 20%
    let tx = await ddsToken
      .connect(owner)
      .transfer(investor1.address, tokens(200000));
    await tx.wait();

    tx = await ddsToken
      .connect(owner)
      .transfer(investor2.address, tokens(200000));
    await tx.wait();

    tx = await ddsToken
      .connect(owner)
      .transfer(investor3.address, tokens(200000));
    await tx.wait();

    tx = await ddsToken
      .connect(owner)
      .transfer(investor4.address, tokens(200000));
    await tx.wait();

    tx = await ddsToken
      .connect(owner)
      .transfer(investor5.address, tokens(200000));
    await tx.wait();

    const DAO = await ethers.getContractFactory('DAO');
    // Set Quorum to > 50% of the token total supply 500k tokens + 1wei, i.e., 500000000000000000000001
    const dao = await DAO.deploy(ddsToken.target, '500000000000000000000001');
    await dao.waitForDeployment();

    await funder.sendTransaction({
      to: dao.target,
      value: ethers.parseEther('100'),
    });

    return {
      dao,
      ddsToken,
      owner,
      funder,
      investor1,
      investor2,
      investor3,
      investor4,
      investor5,
      recipient,
      user,
    };
  }

  async function createProposalFixture() {
    const { dao, investor1, investor2, investor3, recipient, user } =
      await loadFixture(deployDAOFixture);
    const transaction = await dao
      .connect(investor1)
      .createProposal(
        'Proposal 1',
        ethers.parseEther('100'),
        recipient.address
      );

    await transaction.wait();
    return {
      dao,
      investor1,
      investor2,
      investor3,
      recipient,
      transaction,
      user,
    };
  }

  async function voteFixture() {
    const { dao, investor1, investor2, investor3, recipient, user } =
      await loadFixture(createProposalFixture);
    const transaction = await dao.connect(investor1).vote(1);
    await transaction.wait();

    return {
      dao,
      investor1,
      investor2,
      investor3,
      recipient,
      transaction,
      user,
    };
  }

  async function governanceFixture() {
    const { dao, investor1, investor2, investor3, recipient } =
      await loadFixture(voteFixture);
    let transaction = await dao.connect(investor2).vote(1);
    await transaction.wait();
    transaction = await dao.connect(investor3).vote(1);
    await transaction.wait();
    transaction = await dao.connect(investor1).finalizeProposal(1);
    await transaction.wait();

    return { dao, investor1, recipient, transaction };
  }

  describe('Deployment', function () {
    it('should send ether to the DAO treasury', async function () {
      const { dao } = await loadFixture(deployDAOFixture);
      expect(await ethers.provider.getBalance(dao.target)).to.equal(
        ethers.parseEther('100')
      );
    });
    it('should return the correct token address', async function () {
      const { dao, ddsToken } = await loadFixture(deployDAOFixture);
      expect(await dao.token()).to.equal(ddsToken.target);
    });

    it('should return the correct quorum', async function () {
      const { dao } = await loadFixture(deployDAOFixture);
      expect(await dao.quorum()).to.equal('500000000000000000000001');
    });
  });

  describe('Create Proposals', function () {
    it('should updates proposal count', async function () {
      const { dao } = await loadFixture(createProposalFixture);
      expect(await dao.proposalCount()).to.equal(1);
    });

    it('should updates proposal mapping', async function () {
      const { dao, recipient } = await loadFixture(createProposalFixture);
      const proposal = await dao.proposals(1);
      expect(proposal.id).to.equal(1);
      expect(proposal.amount).to.equal(ethers.parseEther('100'));
      expect(proposal.recipient).to.equal(recipient.address);
    });

    it('should emit a Propose event', async function () {
      const { dao, investor1, recipient, transaction } = await loadFixture(
        createProposalFixture
      );
      await expect(transaction)
        .to.emit(dao, 'Propose')
        .withArgs(
          1,
          ethers.parseEther('100'),
          recipient.address,
          investor1.address
        );
    });

    it('should reject invalid amount', async function () {
      const { dao, investor1, recipient } = await loadFixture(deployDAOFixture);
      await expect(
        dao
          .connect(investor1)
          .createProposal(
            'Proposal 1',
            ethers.parseEther('1000'),
            recipient.address
          )
      ).to.be.reverted;
    });

    it('should reject non investor', async function () {
      const { dao, user, recipient } = await loadFixture(deployDAOFixture);
      await expect(
        dao
          .connect(user)
          .createProposal(
            'Proposal 1',
            ethers.parseEther('100'),
            recipient.address
          )
      ).to.be.reverted;
    });
  });

  describe('Voting', function () {
    it('should update vote count', async function () {
      const { dao } = await loadFixture(voteFixture);
      const proposal = await dao.proposals(1);
      expect(proposal.votes).to.equal(tokens(200000));
    });

    it('should reject non investor', async function () {
      const { dao, user } = await loadFixture(createProposalFixture);
      await expect(dao.connect(user).vote(1)).to.be.reverted;
    });

    it('should reject double voting', async function () {
      const { dao, investor1 } = await loadFixture(voteFixture);
      await expect(dao.connect(investor1).vote(1)).to.be.reverted;
    });

    it('should emit vote event', async function () {
      const { dao, investor1, transaction } = await loadFixture(voteFixture);
      await expect(transaction)
        .to.emit(dao, 'Vote')
        .withArgs(1, investor1.address);
    });
  });

  describe('Governance', function () {
    it('should update the proposal to finalized', async function () {
      const { dao } = await loadFixture(governanceFixture);
      const proposal = await dao.proposals(1);
      expect(proposal.finalized).to.equal(true);
    });

    it('should transfer funds to recipient', async function () {
      const { dao, recipient } = await loadFixture(governanceFixture);
      expect(await ethers.provider.getBalance(recipient.address)).to.equals(
        tokens(10100)
      );
    });

    it('should emit vote event', async function () {
      const { dao, transaction } = await loadFixture(governanceFixture);
      await expect(transaction).to.emit(dao, 'Finalize').withArgs(1);
    });

    it('should reject proposal if already finalized', async function () {
      const { dao, investor1 } = await loadFixture(governanceFixture);
      await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted;
    });

    it('should reject finalization if not enough votes', async function () {
      const { dao, investor1 } = await loadFixture(voteFixture);
      await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted;
    });

    it('should reject finalization if not enough votes', async function () {
      const { dao, investor1, investor2, investor3, user } = await loadFixture(
        voteFixture
      );
      let tx = await dao.connect(investor2).vote(1);
      await tx.wait();
      tx = await dao.connect(investor3).vote(1);
      await tx.wait();

      await expect(dao.connect(user).finalizeProposal(1)).to.be.reverted;
    });
  });
});
