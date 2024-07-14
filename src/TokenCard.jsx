import React, { useState, useEffect } from 'react';
import MediaRenderer from './MediaRenderer';
import CommentSection from './CommentSection';
import { fetchUserProfiles } from './fetchUserProfile';

const TokenCard = ({
  token,
  commentsVisible,
  commentInputVisible,
  sortOrder,
  userProfiles,
  newComments,
  minting,
  isPending,
  isConfirming,
  handleMint,
  mintQuantity,
  setCommentsVisible,
  setCommentInputVisible,
  setSortOrder,
  setNewComments,
  setMintQuantity,
  USE_USERNAMES,
  CORS_PROXY,
  COLLECTION_ADDRESS,
  setUserProfiles
}) => {
  const [creatorProfile, setCreatorProfile] = useState(null);

  useEffect(() => {
    const getProfiles = async () => {
      if (USE_USERNAMES) {
        const addresses = [
          token.toAddress
        ]

        try {
          const profiles = await fetchUserProfiles(addresses, CORS_PROXY);
          setCreatorProfile(profiles[token.toAddress]);
          setUserProfiles(profiles);
        } catch (error) {
          console.error('Error fetching profiles:', error);
        }
      }
    };

    getProfiles();
  }, [token.toAddress, newComments, USE_USERNAMES, CORS_PROXY, setUserProfiles]);

  const getTokenUrl = (tokenId) => {
    return `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${tokenId}`;
  };

  const getTransactionUrl = (txHash) => {
    return `https://basescan.org/tx/${txHash}`;
  };

  const getZoraProfileUrl = (address) => {
    return `https://zora.co/${address}`;
  };

  return (
    <div className="token-card">
      {USE_USERNAMES ? (
        <div className="token-title">
          <div className="creator-info">
            {creatorProfile?.avatar && (
              <img src={creatorProfile.avatar} alt="Creator avatar" className="creator-avatar" />
            )}
            <span><a
              href={getZoraProfileUrl(token.toAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="info-link"
            >{creatorProfile?.username || token.toAddress}</a> posted </span>
          </div>
          <h2>{token.metadata.name}</h2>
        </div>
      ) : (
        <>
          <h2 className="token-title">{token.metadata.name}</h2>
          <div className="creator-info">
            Creator: <a
              href={getZoraProfileUrl(token.toAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="info-link"
            >
              {token.toAddress}
            </a>
          </div>
        </>
      )}
      <div className="post-info">
        <div>
          Token ID:
          <a
            href={getTokenUrl(token.tokenId)}
            target="_blank"
            rel="noopener noreferrer"
            className="info-link"
          >
            {token.tokenId}
          </a>
        </div>
        <div>Block: {token.blockNumber}</div>
        <div>
          Tx:
          <a
            href={getTransactionUrl(token.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="info-link"
          >
            {token.transactionHash.slice(0, 8)}...
          </a>
        </div>
      </div>
      <MediaRenderer mediaType={token.mediaType} url={token.mediaURL} imageUrl={token.imageURL} />

      <CommentSection
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
        USE_USERNAMES={USE_USERNAMES}
        CORS_PROXY={CORS_PROXY}
        COLLECTION_ADDRESS={COLLECTION_ADDRESS}
      />
    </div>
  );
};

export default TokenCard;
