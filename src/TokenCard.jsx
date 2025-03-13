import React, { useState, useEffect } from 'react';
import MediaRenderer from './MediaRenderer';
import CommentSection from './CommentSection';
import { fetchUserProfiles } from './fetchUserProfile';
import { getIPFSUrl } from './utils';

// Function to decode Base64 tokenId to numeric value
const decodeTokenId = (encodedId) => {
  try {
    // Decode Base64 to string, then parse the numeric part
    const decoded = atob(encodedId);
    const numericId = decoded.split('.').pop() || decoded; // Extract the last part (e.g., "36")
    return numericId;
  } catch (e) {
    console.error('Error decoding tokenId:', e, encodedId);
    return encodedId; // Fallback to original if decoding fails
  }
};

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
  setUserProfiles,
  IPFS_GATEWAY
}) => {
  const [creatorProfile, setCreatorProfile] = useState(null);

  useEffect(() => {
    const getProfiles = async () => {
      if (USE_USERNAMES && token.originatorAddress) {
        const addresses = [token.originatorAddress];

        try {
          const profiles = await fetchUserProfiles(addresses, CORS_PROXY);
          setCreatorProfile(profiles[token.originatorAddress]);
          setUserProfiles(profiles);
        } catch (error) {
          console.error('Error fetching profiles:', error);
        }
      }
    };

    getProfiles();
  }, [token.originatorAddress, newComments, USE_USERNAMES, CORS_PROXY, setUserProfiles]);

  const getTokenUrl = (tokenId) => {
    const numericTokenId = decodeTokenId(tokenId);
    return `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${numericTokenId}`;
  };

  const getZoraProfileUrl = (address) => {
    return `https://zora.co/${address}`;
  };

  const avatarUrl = creatorProfile?.avatar ? getIPFSUrl(creatorProfile.avatar, IPFS_GATEWAY) : null;

  return (
    <div className="token-card">
      {USE_USERNAMES ? (
        <div className="token-title">
          <div className="creator-info">
            {avatarUrl && (
              <img src={avatarUrl} alt="Creator avatar" className="creator-avatar" />
            )}
            <span>
              <a
                href={getZoraProfileUrl(token.originatorAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="info-link"
              >
                {creatorProfile?.username || token.originatorAddress || 'Unknown Creator'}
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
            {decodeTokenId(token.tokenId)}
          </a>
        </div>
      </div>
      <MediaRenderer mediaType={token.mediaType} url={token.mediaURL} imageUrl={token.imageURL} />

      <CommentSection
        token={token}
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
      />
    </div>
  );
};

export default TokenCard;