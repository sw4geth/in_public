import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getColorFromAddress } from './utils';
import CommentButton from './CommentButton';
import { fetchUserProfiles } from './fetchUserProfile';
import { zoraSepolia } from 'wagmi/chains';

const CommentSection = ({
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
  CORS_PROXY
}) => {
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    const addresses = token.comments.map(comment => comment.fromAddress);
    console.log('Addresses for fetching profiles:', addresses); // Debug logging

    const fetchProfiles = async () => {
      try {
        const profiles = await fetchUserProfiles(addresses, CORS_PROXY);
        console.log('Fetched profiles:', profiles); // Debug logging

        setUserProfiles(profiles);
      } catch (error) {
        console.error('Error fetching profiles:', error); // Error logging
      }
    };

    fetchProfiles();
  }, [token.comments, CORS_PROXY]);

  const sortComments = (comments) => {
    return [...comments].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.blockNumber - a.blockNumber;
        case 'oldest':
          return a.blockNumber - b.blockNumber;
        case 'mostMinted':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });
  };

  const truncateAddress = (address) => {
    return address.slice(0, 8);
  };

  const getZoraProfileUrl = (address) => {
    return `https://zora.co/${address}`;
  };

  return (
    <div className="comment-section">
      {commentsVisible && (
        <div className="comment-sort">
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="mostMinted">Sort: Most Minted</option>
          </select>
        </div>
      )}
      {commentsVisible && (
        <ul className="comment-list">
  {sortComments(token.comments).map((comment, index) => (
    <li key={index} className="comment-item">
      <div className="comment-avatar">

          <img
          src={userProfiles[comment.fromAddress]?.avatar || 'fallback-image-url-if-avatar-missing'}
          alt="User avatar"
          className="user-avatar"
          />
      
      </div>
      <div className="comment-content">
        <a
          href={getZoraProfileUrl(comment.fromAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="comment-address"
          title={comment.fromAddress}
        >
          {USE_USERNAMES
            ? (userProfiles[comment.fromAddress]?.username || comment.fromAddress)
            : truncateAddress(comment.fromAddress)}
        </a>
        <p className="comment-text"><ReactMarkdown>{comment.comment}</ReactMarkdown></p>
        {comment.quantity > 1 && (
          <span className="comment-quantity">
            Minted: {comment.quantity}
            {comment.quantity >= 3 && <span className="fire-emoji"> 🔥</span>}
          </span>
        )}
      </div>
    </li>
  ))}
</ul>

      )}
      <div className={`comment-input-container ${commentInputVisible ? '' : 'collapsed'}`}>
        <button
          className="toggle-comment-input"
          onClick={() => setCommentInputVisible(!commentInputVisible)}
        >
          {commentInputVisible ? '×' : 'Add Comment +'}
        </button>
        {commentInputVisible && (
          <textarea
            className="comment-input"
            placeholder="Type Something"
            value={newComments[token.tokenId] || ""}
            onChange={(e) => setNewComments(prev => ({ ...prev, [token.tokenId]: e.target.value }))}
          />
        )}
      </div>
      <div className="comment-actions">
        <button
          className="hide-comments-button"
          onClick={() => setCommentsVisible(!commentsVisible)}
        >
          {commentsVisible ? 'Hide Comments' : 'Show Comments'}
        </button>
        <CommentButton
          handleMint={handleMint}
          tokenId={token.tokenId}
          minting={minting}
          isPending={isPending}
          isConfirming={isConfirming}
          expectedChainId={zoraSepolia.id}
          expectedNetworkName={zoraSepolia.name}
        />
        <div className="mint-quantity-selector">
          <div className="quantity-display">{mintQuantity}x</div>
          <div className="quantity-controls">
            <button
              className="quantity-button increment"
              onClick={() => setMintQuantity(prev => Math.min(prev + 1, 99999))}
            >
              +
            </button>
            <button
              className="quantity-button decrement"
              onClick={() => setMintQuantity(prev => Math.max(prev - 1, 1))}
            >
              -
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
