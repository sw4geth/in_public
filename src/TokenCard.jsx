
import React from 'react';
import MediaRenderer from './MediaRenderer';
import CommentSection from './CommentSection';

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
  setMintQuantity
}) => {
  return (
    <div className="token-card">
      <h2 className="token-title">{token.metadata.name}</h2>
      <div className="block-number">Block: {token.blockNumber}</div>
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
      />
    </div>
  );
};

export default TokenCard;
