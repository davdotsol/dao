import { ethers } from 'ethers';

const Proposals = ({ provider, dao, proposals, quorum, setIsLoading }) => {
  const voteHandler = async (id) => {
    try {
      const signer = await provider.getSigner();
      const tx = dao.connect(signer).vote(id);
      await tx.wait();
    } catch (error) {
      window.alert('User rejected or transaction reverted');
    }

    setIsLoading(true);
  };

  const finalizeHandler = async (id) => {
    try {
      const signer = await provider.getSigner();
      const tx = dao.connect(signer).finalizeProposal(id);
      await tx.wait();
    } catch (error) {
      window.alert('User rejected or transaction reverted');
    }

    setIsLoading(true);
  };

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">
              #
            </th>
            <th scope="col" className="px-6 py-3">
              Proposal Name
            </th>
            <th scope="col" className="px-6 py-3">
              Recipient Address
            </th>
            <th scope="col" className="px-6 py-3">
              Amount
            </th>
            <th scope="col" className="px-6 py-3">
              Status
            </th>
            <th scope="col" className="px-6 py-3">
              Total Votes
            </th>
            <th scope="col" className="px-6 py-3">
              Cast Vote
            </th>
            <th scope="col" className="px-6 py-3">
              Finalize
            </th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((proposal, i) => (
            <tr
              key={i}
              className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
            >
              <th
                scope="row"
                className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
              >
                {proposal.id.toString()}
              </th>
              <td className="px-6 py-4">{proposal.name}</td>
              <td className="px-6 py-4">{proposal.recipient}</td>
              <td className="px-6 py-4">
                {ethers.formatUnits(proposal.amount, 'ether')} ETH
              </td>
              <td className="px-6 py-4">
                {proposal.finalized ? 'Approved' : 'In Progress'}
              </td>
              <td className="px-6 py-4">{proposal.votes.toString()}</td>
              <td className="px-6 py-4">
                {!proposal.finalized && (
                  <button onClick={() => voteHandler(proposal.id)}>Vote</button>
                )}
              </td>
              <td className="px-6 py-4">
                {!proposal.finalized && proposal.votes > quorum && (
                  <button onClick={() => finalizeHandler(proposal.id)}>
                    Finalize
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Proposals;
