const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (m) => {
  return ethers.parseUnits(m.toString(), 18);
};

describe('DAO contract', function () {
  async function deployFixture() {
    const [owner, ...investors] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', '1000000');
    await ddsToken.waitForDeployment();

    // Send tokens to investors - each one gets 20%
    for (const investor of investors.slice(0, 5)) {
      let tx = await ddsToken
        .connect(owner)
        .transfer(investor.address, tokens(200000));
      await tx.wait();
    }

    const DAO = await ethers.getContractFactory('DAO');
    // Set Quorum to > 50% of the token total supply 500k tokens + 1wei, i.e., 500000000000000000000001
    const dao = await DAO.deploy(ddsToken.target, '500000000000000000000001');
    await dao.waitForDeployment();

    const funder = investors[5];
    await funder.sendTransaction({
      to: dao.target,
      value: ethers.parseEther('100'),
    });

    return {
      dao,
      ddsToken,
      owner,
      funder,
      investors,
    };
  }

  async function proposalFixture() {
    const { dao, investors } = await loadFixture(deployFixture);
    const transaction = await dao
      .connect(investors[0])
      .createProposal(
        'Proposal 1',
        ethers.parseEther('100'),
        investors[6].address
      );

    await transaction.wait();
    return {
      dao,
      investors,
    };
  }

  describe('Deployment', function () {
    it('should set initial conditions correctly', async function () {
      const { dao, ddsToken } = await loadFixture(deployFixture);
      expect(await dao.token()).to.equal(ddsToken.target);
      expect(await ethers.provider.getBalance(dao.target)).to.equal(
        ethers.parseEther('100')
      );
      expect(await dao.quorum()).to.equal('500000000000000000000001');
    });
  });

  describe('Proposals', function () {
    it('should allow a token holder to create a proposal', async function () {
      const { dao, investors } = await loadFixture(deployFixture);
      await expect(
        dao
          .connect(investors[0])
          .createProposal(
            'Proposal 1',
            ethers.parseEther('100'),
            investors[6].address
          )
      )
        .to.emit(dao, 'Propose')
        .withArgs(
          1,
          'Proposal 1',
          ethers.parseEther('100'),
          investors[6].address,
          investors[0].address
        );
    });

    it('should prevent non-token holders from creating proposals', async function () {
      const { dao, investors } = await loadFixture(deployFixture);
      await expect(
        dao
          .connect(investors[7])
          .createProposal(
            'Proposal 1',
            ethers.parseEther('1000'),
            investors[6].address
          )
      ).to.be.revertedWith('DAO: must be token holder');
    });
  });

  describe('Voting', function () {
    it('should allow voting and track votes correctly', async function () {
      const { dao, investors } = await loadFixture(proposalFixture);
      const voteTx = await dao.connect(investors[1]).vote(1);
      await expect(voteTx)
        .to.emit(dao, 'Vote')
        .withArgs(1, investors[1].address, tokens(200000));
      const proposal = await dao.proposals(1);
      expect(proposal.votes).to.equal(tokens(200000));
    });

    it('should reject double voting', async function () {
      const { dao, investors } = await loadFixture(proposalFixture);
      await dao.connect(investors[1]).vote(1);
      await expect(dao.connect(investors[1]).vote(1)).to.be.revertedWith(
        'DAO: already voted'
      );
    });
  });

  describe('Governance', function () {
    it('should finalize proposals correctly', async function () {
      const { dao, investors } = await loadFixture(proposalFixture);
      for (let i = 1; i <= 3; i++) {
        await dao.connect(investors[i]).vote(1);
      }
      const finalizeTx = await dao.connect(investors[0]).finalizeProposal(1);
      await expect(finalizeTx)
        .to.emit(dao, 'Finalize')
        .withArgs(1, tokens(600000));
      const proposal = await dao.proposals(1);
      expect(proposal.finalized).to.be.true;
    });

    it('should reject finalization if quorum not met', async function () {
      const { dao, investors } = await loadFixture(proposalFixture);
      await dao.connect(investors[1]).vote(1);
      await expect(
        dao.connect(investors[0]).finalizeProposal(1)
      ).to.be.revertedWith('DAO: must reach quorum to finalize');
    });
  });
});
