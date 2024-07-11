import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { fetchTokenData } from './api';
import headerImage from './header.svg';

const chains = [mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches

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
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs
  const alertShownRef = useRef(false);
  const observerTarget = useRef(null);
  const initialLoadRef = useRef(false);

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

  const getUniqueAddresses = useCallback((tokens) => {
    const addresses = new Set();
    tokens.forEach(token => {
      addresses.add(token.originatorAddress);
      token.comments.forEach(comment => {
        addresses.add(comment.fromAddress);
      });
    });
    return Array.from(addresses);
  }, []);

  const fetchUserProfiles = useCallback(async (addresses) => {
    const profiles = {};
    for (const address of addresses) {
      const profile = await fetchUserProfile(address, userProfiles, setUserProfiles, USE_USERNAMES, CORS_PROXY);
      if (profile) {
        profiles[address] = profile;
      }
    }
    return profiles;
  }, [USE_USERNAMES, CORS_PROXY, userProfiles]);

  const loadMoreTokens = useCallback(async () => {
    if (!hasNextPage || loading || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoading(true);
    try {
      console.log(`Making request ${requestCount + 1}. Timestamp: ${new Date().toISOString()}`);

      const result = await fetchTokenData(API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, NETWORK, CHAIN, BATCH_SIZE, endCursor);

      setRequestCount(prevCount => prevCount + 1);
      console.log(`Request ${requestCount + 1} completed. Total requests: ${requestCount + 1}`);

      const newTokens = result.tokens;

      const uniqueAddresses = getUniqueAddresses(newTokens);
      await wait(1000); // Add a delay before fetching user profiles
      const newProfiles = await fetchUserProfiles(uniqueAddresses);

      setTokens(prevTokens => [...prevTokens, ...newTokens]);
      setUserProfiles(prevProfiles => ({ ...prevProfiles, ...newProfiles }));
      setHasNextPage(result.pageInfo.hasNextPage);
      setEndCursor(result.pageInfo.endCursor);

      // Add delay before allowing next batch
      await wait(DELAY_BETWEEN_BATCHES);
    } catch (error) {
      console.error('Error loading more tokens:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [hasNextPage, loading, isLoadingMore, endCursor, requestCount, API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, NETWORK, CHAIN, getUniqueAddresses, fetchUserProfiles]);

  useEffect(() => {
    lottie.loadAnimation({
      container: document.querySelector("#loader"),
      animationData: loader,
    });
  }, []);

  useEffect(() => {
    let observer;

    if (initialLoadComplete && observerTarget.current && !isLoadingMore) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loading && hasNextPage && !isLoadingMore) {
            loadMoreTokens();
          }
        },
        { threshold: 0.1 } // Trigger when 10% of the target is visible
      );

      observer.observe(observerTarget.current);
    }

    return () => {
      if (observer && observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMoreTokens, loading, hasNextPage, initialLoadComplete, isLoadingMore]);

  useEffect(() => {
    const initialLoad = async () => {
      if (initialLoadRef.current) return; // Prevent multiple initial loads
      initialLoadRef.current = true;

      setLoading(true);
      setError(null);
      try {
        console.log(`Making initial request. Timestamp: ${new Date().toISOString()}`);

        const result = await fetchTokenData(API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, NETWORK, CHAIN, BATCH_SIZE, null);

        setRequestCount(1);
        console.log(`Initial request completed. Total requests: 1`);

        const initialTokens = result.tokens;

        const uniqueAddresses = getUniqueAddresses(initialTokens);
        await wait(1000); // Add a delay before fetching user profiles
        const initialProfiles = await fetchUserProfiles(uniqueAddresses);

        setTokens(initialTokens);
        setUserProfiles(initialProfiles);
        setHasNextPage(result.pageInfo.hasNextPage);
        setEndCursor(result.pageInfo.endCursor);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError(`Failed to load data. ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, []); // Empty dependency array to ensure this only runs once

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

  if (loading && tokens.length === 0) return <div id="loader"></div>;
  if (error) return <div>Error: {error}. Please try refreshing the page.</div>;

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <div className="App">
          <div className="header-image-container">
            <img src={headerImage} alt="Header" className="header-image" />
          </div>

          {tokens.map(token => (
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
              CORS_PROXY={CORS_PROXY}
              USE_USERNAMES={USE_USERNAMES}
              COLLECTION_ADDRESS={COLLECTION_ADDRESS}
            />
          ))}

          {hasNextPage && (
            <div ref={observerTarget} style={{ height: '20px', margin: '20px 0' }}>
              {loading ? 'Loading more...' : 'Scroll to load more'}
            </div>
          )}
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
