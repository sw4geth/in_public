import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  CORS_PROXY
}) => {
  const [userProfiles, setUserProfiles] = useState({});
  const [processedComments, setProcessedComments] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});

  useEffect(() => {
    const addresses = token.comments.map(comment => comment.fromAddress);

    const fetchProfiles = async () => {
      try {
        const profiles = await fetchUserProfiles(addresses, CORS_PROXY);
        setUserProfiles(profiles);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };

    fetchProfiles();
  }, [token.comments, CORS_PROXY]);

  useEffect(() => {
    const processComments = () => {
      const sorted = sortComments(token.comments);
      const processed = sorted.map(comment => ({
        ...comment,
        truncatedComment: comment.comment.slice(0, 500),
        needsTruncation: comment.comment.length > 500
      }));
      setProcessedComments(processed);
    };

    processComments();
  }, [token.comments, sortOrder]);

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

  const getZoraProfileUrl = (address) => {
    return `https://zora.co/${address}`;
  };

  const toggleCommentExpansion = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
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
      {commentsVisible && processedComments.length > 0 && (
        <ul className="comment-list">
          {processedComments.map((comment, index) => (
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
                  {userProfiles[comment.fromAddress]?.username || comment.fromAddress}
                </a>
                <p className="comment-text">
                  <ReactMarkdown>
                    {expandedComments[comment.id] || !comment.needsTruncation
                      ? comment.comment
                      : `${comment.truncatedComment}...`}
                  </ReactMarkdown>
                  {comment.needsTruncation && (
                    <a href onClick={() => toggleCommentExpansion(comment.id)} className="show-more-link">
                      {expandedComments[comment.id] ? 'Show less' : 'Show more'}
                    </a>
                  )}
                </p>
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
