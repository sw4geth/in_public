import React from 'react';
import MediaRenderer from './MediaRenderer';
import CommentSection from './CommentSection';
import { getIPFSUrl } from './utils';

const TokenCard = ({
  token,
  commentsVisible,
  commentInputVisible,
  sortOrder,
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
  COLLECTION_ADDRESS,
  IPFS_GATEWAY,
  commentsLoading,
}) => {
  const getTokenUrl = (tokenId) => {
    return `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${tokenId}`;
  };

  const getZoraProfileUrl = (address) => {
    return `https://zora.co/${address}`;
  };

  return (
    <div className="token-card">
      {USE_USERNAMES ? (
        <div className="token-title">
          <div className="creator-info">
            <span>
              <a
                href={getZoraProfileUrl(token.originatorAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="info-link"
              >
                {token.originatorAddress || 'Unknown Creator'}
              </a>{' '}
              posted
            </span>
          </div>
          <h2>{token.metadata.name}</h2>
        </div>
      ) : (
        <>
          <h2 className="token-title">{token.metadata.name}</h2>
          <div className="creator-info">
            Creator:{' '}
            <a
              href={getZoraProfileUrl(token.originatorAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="info-link"
            >
              {token.originatorAddress || 'Unknown Creator'}
            </a>
          </div>
        </>
      )}
      <div className="post-info">
        <div>
          Token ID:{' '}
          <a
            href={getTokenUrl(token.tokenId)}
            target="_blank"
            rel="noopener noreferrer"
            className="info-link"
          >
            {token.tokenId}
          </a>
        </div>
      </div>
      <MediaRenderer mediaType={token.mediaType} url={token.mediaURL} imageUrl={token.imageURL} />

      <CommentSection
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
        setCommentInputVisible={setCommentInputVisible}
        setSortOrder={setSortOrder}
        setNewComments={setNewComments}
        setMintQuantity={setMintQuantity}
        IPFS_GATEWAY={IPFS_GATEWAY}
        loadingComments={commentsLoading}
      />
    </div>
  );
};

export default TokenCard;