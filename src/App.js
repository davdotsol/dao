import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import { ethers } from 'ethers';
import Info from './components/Info';
import Loading from './components/Loading';

import config from './config.json';

import TOKEN_ABI from './abis/Token.json';
import DAO_ABI from './abis/DAO.json';
import Proposals from './components/Proposals';
import Create from './components/Create';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dao, setDao] = useState(null);
  const [treasuryBalance, setTreasuryBalance] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [quorum, setQuorum] = useState(null);

  const loadBlockchainData = async () => {
    const tempProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(tempProvider);

    const { chainId } = await tempProvider.getNetwork();

    const tempToken = new ethers.Contract(
      config[chainId].token.address,
      TOKEN_ABI,
      tempProvider
    );
    const tempDao = new ethers.Contract(
      config[chainId].dao.address,
      DAO_ABI,
      tempProvider
    );

    setDao(tempDao);

    const treasuryBalance = ethers.formatUnits(
      await tempProvider.getBalance(config[chainId].dao.address),
      18
    );
    setTreasuryBalance(treasuryBalance);

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const tempAccount = ethers.getAddress(accounts[0]);
    setAccount(tempAccount);

    const tempAccountBalance = ethers.formatUnits(
      await tempToken.balanceOf(tempAccount),
      18
    );
    setAccountBalance(tempAccountBalance);

    const count = await tempDao.proposalCount();
    const items = [];

    for (let i = 0; i < count; i++) {
      const proposal = await tempDao.proposals(i + 1);
      items.push(proposal);
    }

    setProposals(items);

    setQuorum(await tempDao.quorum());

    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData();
    }
  }, [isLoading]);
  return (
    <div className="container mx-auto px-4">
      <Navigation />

      <h1 className="my-4 text-center">Introducing My DAO</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <div>
          <hr />
          <p className="text-center">
            <strong>Treasury Balance:</strong> {treasuryBalance} ETH &nbsp;
            <strong>Quorum:</strong> {quorum.toString()}
          </p>
          <hr />
          <Create provider={provider} dao={dao} setIsLoading={setIsLoading} />
          <Proposals
            provider={provider}
            dao={dao}
            proposals={proposals}
            quorum={quorum}
            setIsLoading={setIsLoading}
          />
        </div>
      )}

      <hr />
      {account && <Info account={account} accountBalance={accountBalance} />}
    </div>
  );
}

export default App;
