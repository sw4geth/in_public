
import React, { useState, useEffect } from 'react';
import MediaRenderer from './MediaRenderer';
import CommentSection from './CommentSection';
import { fetchUserProfile } from './fetchUserProfile';

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
  COLLECTION_ADDRESS
}) => {
  const [creatorProfile, setCreatorProfile] = useState(null);

  useEffect(() => {
    const getCreatorProfile = async () => {
      if (USE_USERNAMES) {
        const profile = await fetchUserProfile(token.originatorAddress, userProfiles, () => {}, USE_USERNAMES, CORS_PROXY);
        setCreatorProfile(profile);
      }
    };

    getCreatorProfile();
  }, [token.originatorAddress, userProfiles, USE_USERNAMES, CORS_PROXY]);

  const getZoraTokenUrl = (tokenId) => {
    return `https://testnet.zora.co/collect/zsep:${COLLECTION_ADDRESS}/${tokenId}`;
  };

  const getZoraTransactionUrl = (txHash) => {
    return `https://sepolia.explorer.zora.energy/tx/${txHash}`;
  };

  const getZoraProfileUrl = (txHash) => {
    return `https://zora.co/${txHash}`;
  };

  return (
    <div className="token-card">
      {USE_USERNAMES ? (
        <div className="token-title">
          {creatorProfile?.avatar && (
            <img src={creatorProfile.avatar} alt="Creator avatar" className="creator-avatar" />
          )}
          <span>{creatorProfile?.username || token.originatorAddress} posted </span>
          <h2>{token.metadata.name}</h2>
        </div>
      ) : (
        <>
          <h2 className="token-title">{token.metadata.name}</h2>
          <div className="creator-info">Creator: <a
          href={getZoraProfileUrl(token.originatorAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="info-link">
          {token.originatorAddress}
          </a>
          </div>
        </>
      )}
      <div className="post-info">
        <div>
          Token ID:
          <a
            href={getZoraTokenUrl(token.tokenId)}
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
            href={getZoraTransactionUrl(token.transactionHash)}
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
      />
    </div>
  );
};

export default TokenCard;
