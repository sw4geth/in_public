import React, { useState, useEffect, useMemo } from 'react';
import { useChainId, usePublicClient, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { WagmiConfig } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia } from 'wagmi/chains';
import MediaRenderer from './MediaRenderer';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './wagmi';
import { getColorFromAddress } from './utils';
import { fetchTokenData } from './api';
import lottie from "lottie-web";
import loader from './loader.json';

const chains = [mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia];

function App() {
  const API_ENDPOINT = "https://api.zora.co/graphql/";
  const IPFS_GATEWAY = "https://magic.decentralized-content.com/ipfs/";
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [minting, setMinting] = useState({});
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [commentInputVisible, setCommentInputVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');
  const [mintQuantity, setMintQuantity] = useState(1);
  const [tokenIdBeingMinted, setTokenIdBeingMinted] = useState(null);

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, isError: isWriteError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const collectorClient = useMemo(() => {
    if (chainId && publicClient) {
      return createCollectorClient({ chainId, publicClient });
    }
    return null;
  }, [chainId, publicClient]);

  useEffect(() => {
    lottie.loadAnimation({
      container: document.querySelector("#loader"),
      animationData: loader,

    });
    const getData = async () => {
      try {
        const tokenData = await fetchTokenData(API_ENDPOINT, IPFS_GATEWAY);
        setTokens(tokenData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  useEffect(() => {
    if (isConfirmed) {
      alert(`Comment minted successfully!`);
      setTokens(prevTokens =>
        prevTokens.map(token => {
          if (token.tokenId === tokenIdBeingMinted) {
            return {
              ...token,
              comments: [
                ...token.comments,
                {
                  fromAddress: address,
                  comment: newComments[token.tokenId],
                  blockNumber: Date.now()
                }
              ]
            };
          }
          return token;
        })
      );
      setNewComments(prev => ({ ...prev, [tokenIdBeingMinted]: "" }));
      setTokenIdBeingMinted(null);
    }
  }, [isConfirmed, address, tokenIdBeingMinted, newComments]);

  const sortComments = (comments) => {
    return [...comments].sort((a, b) => {
      return sortOrder === 'newest' ? b.blockNumber - a.blockNumber : a.blockNumber - b.blockNumber;
    });
  };

  const handleMint = async (tokenId) => {
    if (!isConnected || !collectorClient) {
      console.log("Wallet not connected or collectorClient not initialized");
      return;
    }

    setMinting(prev => ({ ...prev, [tokenId]: true }));
    setTokenIdBeingMinted(tokenId);

    try {
      const { prepareMint } = await collectorClient.getToken({
        tokenContract: "0x9e2e41d622ddf5c561d57407c6fdfb4f92bf9e1e",
        mintType: "1155",
        tokenId: BigInt(tokenId)
      });

      const { parameters, costs } = prepareMint({
        minterAccount: address,
        quantityToMint: BigInt(mintQuantity),
        mintComment: newComments[tokenId] || "",
        mintReferral: "0x0E38A4b9B58AbD2f4c9B2D5486ba047a47606781"
      });

      await writeContract(parameters);
    } catch (error) {
      console.error("Error in minting process:", error);
      alert(`Error minting comment for token ${tokenId}: ${error.message}`);
      setMinting(prev => ({ ...prev, [tokenId]: false }));
      setTokenIdBeingMinted(null);
    }
  };

  if (loading) return <div id="loader"></div>;
  if (error) return <div>Error: {error}</div>;

  const getTokenTitle = (token) => {
    if (token.metadata && token.metadata.name) {
      return token.metadata.name;
    }
    return `Token #${token.tokenId}`;
  };

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <div className="App">

        <header className="site-header">
        <img src="./INPUBLIC.png" alt="Site Header" />
        </header>

          {tokens.map(token => (
            <div key={token.tokenId} className="token-card">
              <h2 className="token-title">{token.metadata.name}</h2>
              <div className="block-number">Block: {token.blockNumber}</div>
              <MediaRenderer mediaType={token.mediaType} url={token.mediaURL} imageUrl={token.imageURL} />



              <div className="comment-section">
  {commentsVisible && (
    <div className="comment-sort">
      <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
        <option value="newest">Sort: Newest</option>
        <option value="oldest">Sort: Oldest</option>
      </select>
    </div>
  )}
  {commentsVisible && (
    <ul className="comment-list">
      {sortComments(token.comments).map((comment, index) => (
        <li key={index} className="comment-item">
          <div
            className="comment-avatar"
            style={{backgroundColor: getColorFromAddress(comment.fromAddress)}}
          ></div>
          <div className="comment-content">
            <span className="comment-address">{comment.fromAddress}</span>
            <p className="comment-text">{comment.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  )}

  <div className={`comment-input-container ${!commentInputVisible ? 'collapsed' : ''}`}>
    {commentInputVisible ? (
      <>
        <textarea
          className="comment-input"
          placeholder="Type Something"
          value={newComments[token.tokenId] || ""}
          onChange={(e) => setNewComments(prev => ({ ...prev, [token.tokenId]: e.target.value }))}
        />
        <button
          className="toggle-comment-input"
          onClick={() => setCommentInputVisible(false)}
        >
          ×
        </button>
      </>
    ) : (
      <div className="collapsed-add-comment" onClick={() => setCommentInputVisible(true)} >
          Add comment +
      </div>
    )}
  </div>

  <div className="comment-actions">
    <button
      className="hide-comments-button"
      onClick={() => setCommentsVisible(!commentsVisible)}
    >
      {commentsVisible ? 'Hide Comments' : 'Show Comments'}
    </button>

    <ConnectButton.Custom>
    {({ openConnectModal }) => (
      <button
        className="comment-button"
        onClick={() => isConnected ? handleMint(token.tokenId) : openConnectModal()}
        disabled={minting[token.tokenId] || isPending || isConfirming}
      >
        {!isConnected ? (commentInputVisible ? "Comment" : "Mint") :
         minting[token.tokenId] || isPending ? "Minting..." :
         isConfirming ? "Confirming..." : (commentInputVisible ? "Comment" : "Mint")}
      </button>
    )}
  </ConnectButton.Custom>

    <div className="mint-quantity-selector">
      <div className="quantity-display">{mintQuantity}x</div>
      <div className="quantity-controls">
        <button
          className="quantity-button increment"
          onClick={() => setMintQuantity(prev => Math.min(prev + 1, 99999))}
        >
          +
        </button>
        <button
          className="quantity-button decrement"
          onClick={() => setMintQuantity(prev => Math.max(prev - 1, 1))}
        >
          -
        </button>
      </div>
    </div>
  </div>

              </div>
            </div>
          ))}
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
