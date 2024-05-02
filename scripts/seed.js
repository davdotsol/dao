const hre = require('hardhat');
const config = require('../src/config.json');

const tokens = (m) => {
  return ethers.parseUnits(m.toString(), 18);
};

async function main() {
  const accounts = await hre.ethers.getSigners();

  const funder = accounts[0];
  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const investor3 = accounts[3];
  const recipient = accounts[4];

  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log('chainid', chainId);
  console.log('config[chainId]', config[chainId]);

  const token = await hre.ethers.getContractAt(
    'Token',
    config[chainId].token.address
  );
  console.log(`token fetched ${token.target}`);

  let tx = await token.transfer(investor1.address, tokens(100));
  await tx.wait();
  tx = await token.transfer(investor2.address, tokens(100));
  await tx.wait();
  tx = await token.transfer(investor3.address, tokens(100));
  await tx.wait();

  const dao = await hre.ethers.getContractAt(
    'DAO',
    config[chainId].dao.address
  );

  tx = await funder.sendTransaction({
    to: (await dao).target,
    value: hre.ethers.parseEther('1000'),
  });
  tx.wait();

  for (let i = 0; i < 3; i++) {
    tx = await dao
      .connect(investor1)
      .createProposal(
        `Proposal ${i + 1}`,
        ethers.parseEther('100'),
        recipient.address
      );

    await tx.wait();

    tx = await dao.connect(investor1).vote(i + 1);
    await tx.wait();

    tx = await dao.connect(investor2).vote(i + 1);
    await tx.wait();

    tx = await dao.connect(investor3).vote(i + 1);
    await tx.wait();

    tx = await dao.connect(investor1).finalizeProposal(i + 1);
    await tx.wait();

    console.log(`Creating & Finalize Proposal ${i + 1}\n`);
  }

  console.log(`Creating one more proposal...\n`);

  tx = await dao
    .connect(investor1)
    .createProposal('Proposal 4', ethers.parseEther('100'), recipient.address);

  await tx.wait();

  tx = await dao.connect(investor2).vote(4);
  await tx.wait();

  tx = await dao.connect(investor3).vote(4);
  await tx.wait();

  console.log(`Finished.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
