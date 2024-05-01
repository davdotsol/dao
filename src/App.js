import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import { ethers } from 'ethers';
import Info from './components/Info';
import Loading from './components/Loading';

import config from './config.json';

import TOKEN_ABI from './abis/Token.json';
import DAO_ABI from './abis/DAO.json';

import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dao, setDao] = useState(null);

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

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const tempAccount = ethers.getAddress(accounts[0]);
    setAccount(tempAccount);
    console.log(tempAccount);

    const tempAccountBalance = ethers.formatUnits(
      await tempToken.balanceOf(tempAccount),
      18
    );
    setAccountBalance(tempAccountBalance);

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

      {isLoading ? <Loading /> : <div>Hello world</div>}

      <hr />
      {account && <Info account={account} accountBalance={accountBalance} />}
    </div>
  );
}

export default App;
