import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useChainId, usePublicClient, useAccount, useWriteContract } from 'wagmi';
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
  const alertShownRef = useRef(false);

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, isError: isWriteError } = useWriteContract();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
  }, []);

  useEffect(() => {
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
    if (hash) {
      setIsConfirming(true);
      const checkTransaction = async () => {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          setIsConfirming(false);
          setIsSuccess(true);
        } catch (error) {
          console.error("Transaction failed:", error);
          setIsConfirming(false);
        }
      };
      checkTransaction();
    }
  }, [hash, publicClient]);

  useEffect(() => {
    console.log('Transaction hash:', hash);
    console.log('Is pending:', isPending);
    console.log('Is confirming:', isConfirming);
    console.log('Is success:', isSuccess);

    if (isSuccess && hash && !alertShownRef.current) {
      console.log('Minting successful, updating state');
      alert(`Comment minted successfully!`);
      alertShownRef.current = true;
      setTokens(prevTokens =>
        prevTokens.map(token => {
          if (token.tokenId === tokenIdBeingMinted) {
            console.log('Updating token:', token.tokenId);
            const newCommentsList = Array(1).fill(null).map(() => ({
              fromAddress: address,
              comment: newComments[token.tokenId],
              blockNumber: Date.now()
            }));
            return {
              ...token,
              comments: [...token.comments, ...newCommentsList]
            };
          }
          return token;
        })
      );
      setNewComments(prev => ({ ...prev, [tokenIdBeingMinted]: "" }));
      setMinting(prev => ({ ...prev, [tokenIdBeingMinted]: false }));
      setTokenIdBeingMinted(null);
      setMintQuantity(1);
      setIsSuccess(false); // Reset success state
    }

    return () => {
      if (isSuccess) {
        alertShownRef.current = false;
      }
    };
  }, [isSuccess, hash, address, tokenIdBeingMinted, newComments, mintQuantity]);

  useEffect(() => {
    if (isWriteError) {
      setMinting({});
      setTokenIdBeingMinted(null);
      setIsConfirming(false);
      setIsSuccess(false);
      alert('Transaction was rejected or failed. Please try again.');
    }
  }, [isWriteError]);

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

    console.log('Starting minting process for token:', tokenId);
    setMinting(prev => ({ ...prev, [tokenId]: true }));
    setTokenIdBeingMinted(tokenId);
    setIsConfirming(false);
    setIsSuccess(false);
    alertShownRef.current = false;

    try {
      const { prepareMint } = await collectorClient.getToken({
        tokenContract: "0x9e2e41d622ddf5c561d57407c6fdfb4f92bf9e1e",
        mintType: "1155",
        tokenId: BigInt(tokenId)
      });

      const { parameters } = prepareMint({
        minterAccount: address,
        quantityToMint: BigInt(mintQuantity),
        mintComment: newComments[tokenId] || "",
        mintReferral: "0x0E38A4b9B58AbD2f4c9B2D5486ba047a47606781"
      });

      console.log('Prepared mint parameters:', parameters);
      await writeContract(parameters);
    } catch (error) {
      console.error("Error in minting process:", error);
      alert(`Error minting comment for token ${tokenId}: ${error.message}`);
      setMinting(prev => ({ ...prev, [tokenId]: false }));
      setTokenIdBeingMinted(null);
      setIsConfirming(false);
      setIsSuccess(false);
    }
  };

  if (loading) return <div id="loader"></div>;
  if (error) return <div>Error: {error}</div>;

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

                <div className="comment-input-container">
                  <button
                    className="toggle-comment-input"
                    onClick={() => setCommentInputVisible(!commentInputVisible)}
                  >
                    {commentInputVisible ? '×' : 'Add comment +'}
                  </button>
                  {commentInputVisible && (
                    <textarea
                      className="comment-input"
                      placeholder="Type Something"
                      value={newComments[token.tokenId] || ""}
                      onChange={(e) => setNewComments(prev => ({ ...prev, [token.tokenId]: e.target.value }))}
                    />
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
                        {!isConnected ? "Connect Wallet" :
                         isPending ? "Waiting for Approval..." :
                         isConfirming ? "Confirming..." :
                         minting[token.tokenId] ? "Minting..." : "Comment"}
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
