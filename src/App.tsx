import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount, usePublicClient, useWriteContract, useConfig } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { WagmiConfig } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './wagmi';
import lottie from "lottie-web";
import loader from './loader.json';
import TokenCard from './TokenCard';
import { fetchUserProfile } from './fetchUserProfile';
import { getData } from './getData';
import headerImage from './header.svg'; // Update this path


const chains = [mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia];

function App() {
  // Constants
  const COLLECTION_ADDRESS = "0x9e2e41d622ddf5c561d57407c6fdfb4f92bf9e1e";
  const NETWORK = "ZORA";
  const CHAIN = "ZORA_SEPOLIA";
  const EXPECTED_CHAIN_ID = zoraSepolia.id;
  const API_ENDPOINT = "https://api.zora.co/graphql/";
  const IPFS_GATEWAY = "https://magic.decentralized-content.com/ipfs/";
  const CORS_PROXY = "https://corsproxy.io/?";
  const USE_USERNAMES = true;

  // State variables
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
  const [userProfiles, setUserProfiles] = useState({});
  const alertShownRef = useRef(false);

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, isError: isWriteError } = useWriteContract();
  const { chains } = useConfig();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const collectorClient = useMemo(() => {
    if (chain?.id && publicClient) {
      return createCollectorClient({ chainId: chain.id, publicClient });
    }
    return null;
  }, [chain?.id, publicClient]);

  useEffect(() => {
    lottie.loadAnimation({
      container: document.querySelector("#loader"),
      animationData: loader,
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await getData(
        API_ENDPOINT,
        IPFS_GATEWAY,
        COLLECTION_ADDRESS,
        NETWORK,
        CHAIN,
        USE_USERNAMES,
        CORS_PROXY,
        userProfiles,
        setUserProfiles,
        setTokens,
        setError
      );
      setLoading(false);
    };

    fetchData();
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
    if (isSuccess && hash && !alertShownRef.current) {
      alert(`Comment minted successfully!`);
      alertShownRef.current = true;
      setTokens(prevTokens =>
        prevTokens.map(token => {
          if (token.tokenId === tokenIdBeingMinted) {
            const newCommentsList = [{
              fromAddress: address,
              comment: newComments[token.tokenId],
              blockNumber: Date.now()
            }];
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
      setIsSuccess(false);
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
        tokenContract: COLLECTION_ADDRESS,
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
        <div className="header-image-container">
            <img src={headerImage} alt="Header" className="header-image" />
        </div>

          {tokens.slice().reverse().map(token => (
            <TokenCard
              key={token.tokenId}
              token={token}
              commentsVisible={commentsVisible}
              commentInputVisible={commentInputVisible}
              sortOrder={sortOrder}
              userProfiles={userProfiles}
              newComments={newComments}
              minting={minting}
              isPending={isPending}
              isConfirming={isConfirming}
              handleMint={handleMint}
              mintQuantity={mintQuantity}
              setCommentsVisible={setCommentsVisible}
              setCommentInputVisible={setCommentInputVisible}
              setSortOrder={setSortOrder}
              setNewComments={setNewComments}
              setMintQuantity={setMintQuantity}
            />
          ))}
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
