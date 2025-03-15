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
import { fetchComments, getApiEndpoint } from './api';
import { determineMediaType, getIPFSUrl } from './utils';
import headerImage from './header.svg';

const chains = [mainnet, polygon, optimism, arbitrum, base, zora, zoraSepolia];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility to parse tokenId from BigInt to string
const parseTokenId = (tokenId: bigint): string => {
  return tokenId.toString();
};

// Fetch IPFS metadata from tokenURI
const fetchIPFSMetadata = async (tokenURI: string, ipfsGateway: string) => {
  try {
    const ipfsUrl = getIPFSUrl(tokenURI, ipfsGateway);
    const response = await fetch(ipfsUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch IPFS metadata from ${ipfsUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching IPFS metadata for ${tokenURI}:`, error);
    return null;
  }
};

function App() {
  const COLLECTION_ADDRESS = "0x3f209430017e4fa79fecf663faff8584c0feac78";
  const CHAIN_ID = 8453; // Base
  const EXPECTED_CHAIN_ID = base.id;
  const API_ENDPOINT = getApiEndpoint();
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [fetchedTokenIds, setFetchedTokenIds] = useState(new Set());

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
    if (publicClient) {
      const chainIdToUse = chain?.id || CHAIN_ID;
      return createCollectorClient({ chainId: chainIdToUse, publicClient });
    }
    return null;
  }, [chain?.id, publicClient]);

  useEffect(() => {
    const fetchTokenData = async () => {
      if (!collectorClient) return;

      try {
        const tokenData = await collectorClient.getTokensOfContract({
          tokenContract: COLLECTION_ADDRESS,
          mintType: "1155"
        });

        if (!tokenData || !tokenData.tokens || !Array.isArray(tokenData.tokens)) {
          throw new Error('Unexpected token data format');
        }

        const tokenPromises = tokenData.tokens.map(async (tokenItem) => {
          const token = tokenItem.token;
          const tokenId = parseTokenId(token.tokenId);
          const tokenURI = token.tokenURI;

          const ipfsMetadata = await fetchIPFSMetadata(tokenURI, IPFS_GATEWAY);
          if (!ipfsMetadata) return null;

          const metadata = {
            content: {
              mime: ipfsMetadata.content?.mime || 'application/octet-stream',
              uri: ipfsMetadata.content?.uri || tokenURI,
            },
            image: ipfsMetadata.image || null,
            name: ipfsMetadata.name || 'Unnamed Token',
          };

          const mediaType = determineMediaType(metadata.content.mime);
          const mediaURL = getIPFSUrl(metadata.content.uri, IPFS_GATEWAY);
          const imageURL = mediaType === 'audio' ? getIPFSUrl(metadata.image, IPFS_GATEWAY) : null;

          return {
            tokenId,
            mediaType,
            mediaURL,
            imageURL,
            metadata,
            originatorAddress: token.creator,
            toAddress: token.creator,
            comments: [],
          };
        });

        const resolvedTokens = (await Promise.all(tokenPromises))
          .filter(token => token !== null)
          .sort((a, b) => Number(b.tokenId) - Number(a.tokenId));

        setTokens(resolvedTokens);
        setHasNextPage(resolvedTokens.length > BATCH_SIZE);
        setInitialLoadComplete(true);
      } catch (err) {
        console.error('Error fetching token data with Zora SDK:', err);
        setError('Failed to fetch token data using Zora SDK.');
      } finally {
        setLoading(false);
      }
    };

    if (collectorClient) fetchTokenData();
  }, [collectorClient]);

  const fetchTokenComments = useCallback(async (tokenIdsToFetch) => {
    if (!tokenIdsToFetch.length || commentsLoading) {
      console.log('Skipping fetchTokenComments: No tokenIds to fetch or comments are loading');
      return;
    }

    console.log(`Fetching comments for tokenIds: ${tokenIdsToFetch.join(', ')}`);
    setCommentsLoading(true);
    const unfetchedTokenIds = tokenIdsToFetch.filter(tokenId => !fetchedTokenIds.has(tokenId));

    if (unfetchedTokenIds.length === 0) {
      console.log('All tokenIds already fetched for comments:', tokenIdsToFetch);
      setCommentsLoading(false);
      return;
    }

    try {
      const result = await fetchComments(API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, CHAIN_ID, BATCH_SIZE, null, unfetchedTokenIds);
      console.log(`Fetched comments result for tokenIds ${unfetchedTokenIds.join(', ')}:`, result);
      console.log(`Result tokens array:`, result.tokens);

      setTokens(prevTokens => {
        const updatedTokens = prevTokens.map(token => {
          const matchingToken = result.tokens.find(t => t.tokenId.toString() === token.tokenId.toString());
          const tokenComments = matchingToken ? matchingToken.comments : [];
          console.log(`Updating tokenId ${token.tokenId} with comments:`, tokenComments);
          return {
            ...token,
            comments: tokenComments,
            _updateTimestamp: Date.now(),
          };
        });
        console.log(`Updated tokens state:`, updatedTokens);
        return updatedTokens;
      });

      setFetchedTokenIds(prev => {
        const newSet = new Set(prev);
        unfetchedTokenIds.forEach(id => newSet.add(id));
        return newSet;
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      console.log('Setting commentsLoading to false');
      setCommentsLoading(false);
    }
  }, [commentsLoading, fetchedTokenIds]);

  useEffect(() => {
    if (!initialLoadComplete || tokens.length === 0) return;

    const displayedTokenIds = tokens
      .slice(0, currentTokenIndex + BATCH_SIZE)
      .map(token => token.tokenId);
    fetchTokenComments(displayedTokenIds);
  }, [initialLoadComplete, currentTokenIndex, fetchTokenComments]);

  const loadMoreTokens = useCallback(() => {
    if (!hasNextPage || loading || isLoadingMore) return;

    setIsLoadingMore(true);
    setCurrentTokenIndex(prev => {
      const newIndex = prev + BATCH_SIZE;
      return newIndex;
    });
    setHasNextPage(currentTokenIndex + BATCH_SIZE < tokens.length);
    setIsLoadingMore(false);
  }, [hasNextPage, loading, isLoadingMore, currentTokenIndex, tokens.length]);

  useEffect(() => {
    lottie.loadAnimation({
      container: document.querySelector("#loader"),
      animationData: loader,
    });
  }, []);

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
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
      if (isSuccess) alertShownRef.current = false;
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
    if (!isConnected || !collectorClient) return;

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
        mintReferral: "0xf32484112e0b6c994f5db084d5c15f2a1d6a4228"
      });

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
  }, [tokens, currentTokenIndex]);

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
          {tokens.slice(0, currentTokenIndex + BATCH_SIZE).map(token => (
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
              IPFS_GATEWAY={IPFS_GATEWAY}
              COLLECTION_ADDRESS={COLLECTION_ADDRESS}
              commentsLoading={commentsLoading}
              USE_USERNAMES={true}
            />
          ))}
          {hasNextPage && (
            <div ref={observerTarget} style={{ height: '20px', margin: '20px 0' }}>
              {isLoadingMore ? 'Loading more...' : 'Scroll to load more'}
            </div>
          )}
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;