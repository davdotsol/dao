const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules');
const hre = require('hardhat');

const DAOModule = buildModule('DAOModule', (m) => {
  const tokenName = m.getParameter('name', 'Dapp Dot Sol');
  const tokenSymbol = m.getParameter('symbol', 'DDS');
  const tokenTotalSupply = m.getParameter('totalSupply', 1000);

  const token = m.contract('Token', [tokenName, tokenSymbol, tokenTotalSupply]);

  const quorum = m.getParameter('quorum', 100); // Define the quorum for the DAO

  const dao = m.contract('DAO', [token, quorum]);

  return { dao, token };
});

module.exports = DAOModule;
