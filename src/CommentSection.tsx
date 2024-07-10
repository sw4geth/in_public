
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { getColorFromAddress } from './utils';
import CommentButton from './CommentButton';
import { zoraSepolia } from 'wagmi/chains';

const CommentSection = ({
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
                {userProfiles[comment.fromAddress]?.avatar ? (
                  <img
                    src={userProfiles[comment.fromAddress].avatar}
                    alt="User avatar"
                    className="user-avatar"
                  />
                ) : (
                  <div
                    className="default-avatar"
                    style={{backgroundColor: getColorFromAddress(comment.fromAddress)}}
                  ></div>
                )}
              </div>
              <div className="comment-content">
                <span className="comment-address">
                  {userProfiles[comment.fromAddress]?.username || comment.fromAddress}
                </span>
                <p className="comment-text"><ReactMarkdown>{comment.comment}</ReactMarkdown></p>
                {comment.quantity > 1 && (
                  <span className="comment-quantity">Minted: {comment.quantity}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="comment-input-container">
        <button
          className="toggle-comment-input"
          onClick={() => setCommentInputVisible(!commentInputVisible)}
        >
          {commentInputVisible ? '×' : 'Add comment +'}
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
