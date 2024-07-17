import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import CommentButton from './CommentButton';
import { fetchUserProfiles } from './fetchUserProfile';
import { base } from 'wagmi/chains';

const CommentSection = ({
  token,
  commentInputVisible,
  sortOrder,
  newComments,
  minting,
  isPending,
  isConfirming,
  handleMint,
  mintQuantity,
  setCommentInputVisible,
  setSortOrder,
  setNewComments,
  setMintQuantity,
  CORS_PROXY
}) => {
  const [userProfiles, setUserProfiles] = useState({});
  const [processedComments, setProcessedComments] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [visibleComments, setVisibleComments] = useState(2);
  const [commentsVisible, setCommentsVisible] = useState(true);

  const sortComments = useCallback((comments) => {
    return [...comments].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.blockNumber - a.blockNumber;
        case 'oldest':
          return a.blockNumber - b.blockNumber;
        case 'mostMinted':
          return b.quantity - a.quantity;
        case 'mostEnjoy':
          const aEnjoyCount = (a.comment.match(/\$enjoy/gi) || []).length;
          const bEnjoyCount = (b.comment.match(/\$enjoy/gi) || []).length;
          return bEnjoyCount - aEnjoyCount;
        default:
          return 0;
      }
    });
  }, [sortOrder]);

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
  }, [token.comments, sortComments]);

  const fetchProfiles = useCallback(async () => {
    if (commentsVisible && processedComments.length > 0) {
      const addresses = processedComments.slice(0, visibleComments).map(comment => comment.fromAddress);
      try {
        const profiles = await fetchUserProfiles(addresses, CORS_PROXY);
        setUserProfiles(prevProfiles => ({...prevProfiles, ...profiles}));
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    }
  }, [commentsVisible, processedComments, visibleComments, CORS_PROXY]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const getZoraProfileUrl = (address) => {
    return `https://zora.co/${address}`;
  };

  const toggleCommentExpansion = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const showMoreComments = () => {
    setVisibleComments(prevVisible => {
      const newVisible = Math.min(prevVisible + 10, processedComments.length);
      return newVisible;
    });
  };

  const toggleCommentsVisibility = () => {
    setCommentsVisible(prev => !prev);
    if (!commentsVisible) {
      setVisibleComments(2);
    }
  };

  const truncateUsername = (username, maxLength = 20) => {
    if (username.length <= maxLength) return username;
    return `${username.slice(0, maxLength - 3)}...`;
  };

  return (
    <div className="comment-section">
      {commentsVisible && (
        <div className="comment-sort">
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="mostMinted">Sort: Most Minted</option>
            <option value="mostEnjoy">Sort: $enjoy</option>
          </select>
        </div>
      )}
      {commentsVisible && processedComments.length > 0 && (
        <ul className="comment-list">
          {processedComments.slice(0, visibleComments).map((comment, index) => (
            <li key={index} className="comment-item">
              <div className="comment-avatar">
                {userProfiles[comment.fromAddress]?.avatar && (
                  <img
                    src={userProfiles[comment.fromAddress].avatar}
                    alt="User avatar"
                    className="user-avatar"
                  />
                )}
              </div>
              <div className="comment-content">
                <a
                  href={getZoraProfileUrl(comment.fromAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="comment-address"
                  title={comment.fromAddress}
                >
                  {truncateUsername(userProfiles[comment.fromAddress]?.username || comment.fromAddress)}
                </a>
                <p className="comment-text">
                  <ReactMarkdown>
                    {expandedComments[comment.id] || !comment.needsTruncation
                      ? comment.comment
                      : `${comment.truncatedComment}...`}
                  </ReactMarkdown>
                  {comment.needsTruncation && (
                    <a href onClick={(e) => { e.preventDefault(); toggleCommentExpansion(comment.id); }} className="show-more-link">
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
      {commentsVisible && processedComments.length > visibleComments && (
      <a
        href
        onClick={(e) => {
          e.preventDefault();
          showMoreComments();
        }}
        className="show-more-comments"
        >
        Show {processedComments.length - visibleComments} more comments
        </a>
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
          onClick={toggleCommentsVisibility}
        >
          {commentsVisible ? 'Hide Comments' : `Show ${token.comments.length} Comments`}
        </button>
        <CommentButton
          handleMint={handleMint}
          tokenId={token.tokenId}
          minting={minting}
          isPending={isPending}
          isConfirming={isConfirming}
          expectedChainId={base.id}
          expectedNetworkName={base.name}
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
