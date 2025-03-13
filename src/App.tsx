import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { WagmiConfig } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './wagmi';
import lottie from "lottie-web";
import loader from './loader.json';
import TokenCard from './TokenCard';
import { fetchTokenData } from './api';
import headerImage from './header.svg';

const chains = [mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility to parse tokenId from the complex string format
const parseTokenId = (tokenId: string): string => {
  if (!tokenId) return '0';
  const parts = tokenId.split('.');
  return parts[parts.length - 1] || '0';
};

function App() {
  const COLLECTION_ADDRESS = "0x3f209430017e4fa79fecf663faff8584c0feac78";
  const CHAIN_ID = 8453; // Base
  const EXPECTED_CHAIN_ID = base.id;
  const API_ENDPOINT = "https://api.zora.co/universal/graphql";
  const IPFS_GATEWAY = "https://magic.decentralized-content.com/ipfs/";
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 5000;

  const renderStartTime = useRef(performance.now());

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
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [tokenIds, setTokenIds] = useState<string[]>([]);
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);

  const alertShownRef = useRef(false);
  const observerTarget = useRef(null);
  const initialLoadRef = useRef(false);

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { writeContract, data: hash, isPending, isError: isWriteError } = useWriteContract();
  const { chains } = useConfig();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const collectorClient = useMemo(() => {
    console.log('Initializing collectorClient...');
    console.log('chain:', chain);
    console.log('publicClient:', publicClient);
    if (publicClient) {
      const chainIdToUse = chain?.id || CHAIN_ID;
      console.log('Using chainId:', chainIdToUse);
      return createCollectorClient({ chainId: chainIdToUse, publicClient });
    }
    return null;
  }, [chain?.id, publicClient]);

  useEffect(() => {
    const fetchTokenIds = async () => {
      if (!collectorClient) {
        console.log('Collector client not initialized');
        return;
      }

      console.log('Starting to fetch token IDs with Zora SDK...');
      try {
        const tokenData = await collectorClient.getTokensOfContract({
          tokenContract: COLLECTION_ADDRESS,
          mintType: "1155"
        });
        console.log('Raw token data from getTokensOfContract:', tokenData);

        const discoveredTokenIds = new Set<string>();
        if (tokenData && tokenData.tokens && Array.isArray(tokenData.tokens)) {
          tokenData.tokens.forEach(token => {
            if (token.token && token.token.tokenId) {
              const tokenId = parseTokenId(token.token.tokenId.toString());
              console.log(`Found tokenId: ${tokenId}`);
              discoveredTokenIds.add(tokenId);
            }
          });
        } else {
          console.warn('Unexpected token data format:', tokenData);
        }

        // Sort in descending order for reverse chronological order (last tokenId first)
        const tokenIdArray = Array.from(discoveredTokenIds).sort((a, b) => Number(b) - Number(a));
        console.log('Discovered token IDs:', tokenIdArray);
        setTokenIds(tokenIdArray);
        setHasNextPage(tokenIdArray.length > 0);
      } catch (err) {
        console.error('Error fetching token IDs with Zora SDK getTokensOfContract:', err);
        setError('Failed to fetch token IDs using Zora SDK.');
      }
    };

    if (collectorClient) {
      fetchTokenIds();
    }
  }, [collectorClient]);

  const loadMoreTokens = useCallback(async () => {
    if (!hasNextPage || loading || isLoadingMore || currentTokenIndex >= tokenIds.length) return;

    setIsLoadingMore(true);
    setLoading(true);
    try {
      console.log(`Making request ${requestCount + 1}. Timestamp: ${new Date().toISOString()}`);

      let newTokens: any[] = [];
      const endIndex = Math.min(currentTokenIndex + BATCH_SIZE, tokenIds.length);
      for (let i = currentTokenIndex; i < endIndex; i++) {
        const tokenId = tokenIds[i];
        console.log(`Fetching token data for tokenId ${tokenId}...`);
        try {
          const result = await fetchTokenData(API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, CHAIN_ID, BATCH_SIZE, endCursor, tokenId);
          console.log(`Token data for tokenId ${tokenId}:`, result);
          newTokens.push(...result.tokens);
        } catch (err) {
          console.error(`Error fetching token data for tokenId ${tokenId}:`, err);
          continue;
        }
      }
      setCurrentTokenIndex(endIndex);

      setRequestCount(prevCount => prevCount + 1);
      console.log(`Request ${requestCount + 1} completed. Total requests: ${requestCount + 1}`);

      setTokens(prevTokens => {
        const updatedTokens = [...prevTokens, ...newTokens];
        console.log('Updated tokens:', updatedTokens);
        return updatedTokens;
      });
      setHasNextPage(endIndex < tokenIds.length);

      await wait(DELAY_BETWEEN_BATCHES);
    } catch (error) {
      console.error('Error loading more tokens:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [hasNextPage, loading, isLoadingMore, endCursor, requestCount, tokenIds, currentTokenIndex]);

  useEffect(() => {
    lottie.loadAnimation({
      container: document.querySelector("#loader"),
      animationData: loader,
    });
  }, []);

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    console.log(`Page render time: ${renderTime.toFixed(2)} milliseconds`);
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
        { threshold: 0.1 }
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
      if (initialLoadRef.current) return;
      initialLoadRef.current = true;

      const loadStartTime = performance.now();

      setLoading(true);
      setError(null);
      try {
        console.log('Token IDs available for initial load:', tokenIds);
        if (tokenIds.length === 0) {
          throw new Error('No token IDs available to fetch.');
        }

        console.log(`Making initial request. Timestamp: ${new Date().toISOString()}`);

        let initialTokens: any[] = [];
        const endIndex = Math.min(BATCH_SIZE, tokenIds.length);
        for (let i = 0; i < endIndex; i++) {
          const tokenId = tokenIds[i];
          console.log(`Fetching initial token data for tokenId ${tokenId}...`);
          try {
            const result = await fetchTokenData(API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, CHAIN_ID, BATCH_SIZE, null, tokenId);
            console.log(`Initial token data for tokenId ${tokenId}:`, result);
            initialTokens.push(...result.tokens);
          } catch (err) {
            console.error(`Error fetching initial token data for tokenId ${tokenId}:`, err);
            continue;
          }
        }
        setCurrentTokenIndex(endIndex);

        setRequestCount(1);
        console.log(`Initial request completed. Total requests: 1`);

        setTokens(initialTokens);
        setHasNextPage(endIndex < tokenIds.length);
        setInitialLoadComplete(true);

        const loadEndTime = performance.now();
        console.log(`Initial data load time: ${(loadEndTime - loadStartTime).toFixed(2)} milliseconds`);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError(`Failed to load data. ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (tokenIds.length > 0) {
      initialLoad();
    }
  }, [tokenIds]);

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
        mintReferral: "0xf32484112E0b6c994f5dB084D5C15F2a1d6a4228"
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

  useEffect(() => {
    console.log('Tokens passed to TokenCard:', tokens);
  }, [tokens]);

  if (loading && tokens.length === 0) return <div id="loader"></div>;
  if (error) return <div>Error: {error}. Please try refreshing the page.</div>;

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <div className="App">
          <div className="header-image-container">
            <img src={headerImage} alt="Header" className="header-image" />
          </div>
          <div className="shopify-button">
            <a href="https://337609-51.myshopify.com/">
              <button>Shop</button>
            </a>
          </div>
          {tokens.map(token => (
            <TokenCard
              key={token.tokenId}
              token={token}
              commentsVisible={commentsVisible}
              commentInputVisible={commentInputVisible}
              sortOrder={sortOrder}
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