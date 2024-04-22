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
    const [owner, funder, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', '1000000');
    await ddsToken.waitForDeployment();

    const DAO = await ethers.getContractFactory('DAO');
    const dao = await DAO.deploy(ddsToken.target, '500000000000000000000001');
    await dao.waitForDeployment();

    await funder.sendTransaction({
      to: dao.target,
      value: ethers.parseEther('100'),
    });

    return { dao, ddsToken, owner, funder, addr2 };
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
});
