
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
  CORS_PROXY,
  USE_USERNAMES
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

  return (
    <div className="token-card">
      {USE_USERNAMES ? (
        <div className="token-title">
          {creatorProfile?.avatar && (
            <img src={creatorProfile.avatar} alt="Creator avatar" className="creator-avatar" />
          )}
          {creatorProfile?.username || token.originatorAddress} posted {token.metadata.name}
        </div>
      ) : (
        <>
          <div className="token-title"><h2>{token.metadata.name}</h2></div>
          <div className="creator-info">Creator: {token.originatorAddress}</div>
        </>
      )}
      <div className="post-info">
      <div>Block: {token.blockNumber}</div>
      <div>Tx: {token.transactionHash}</div>
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
