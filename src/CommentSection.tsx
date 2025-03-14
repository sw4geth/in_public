import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import CommentButton from './CommentButton';
import { base } from 'wagmi/chains';
import { getIPFSUrl } from './utils';
import lottie from 'lottie-web';
import loader from './loader.json';

const DEFAULT_AVATAR_TEMPLATE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="gzr-{ADDRESS}" gradientTransform="translate(66.4578 24.3575) scale(75.2908)" gradientUnits="userSpaceOnUse" r="1" cx="0" cy="0%">
      <stop offset="15.62%" stop-color="hsl({HUE}, 70%, 85%)" />
      <stop offset="39.58%" stop-color="hsl({HUE}, 75%, 63%)" />
      <stop offset="72.92%" stop-color="hsl({HUE}, 79%, 41%)" />
      <stop offset="90.63%" stop-color="hsl({HUE}, 81%, 32%)" />
      <stop offset="100%" stop-color="hsl({HUE}, 81%, 32%)" />
    </radialGradient>
  </defs>
  <g>
    <path d="M100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50Z" fill="url(#gzr-{ADDRESS})" />
    <path stroke="rgba(0,0,0,0.075)" fill="transparent" stroke-width="1" d="M50,0.5c27.3,0,49.5,22.2,49.5,49.5S77.3,99.5,50,99.5S0.5,77.3,0.5,50S22.7,0.5,50,0.5z" />
  </g>
</svg>
`;

const generateColor = (address: string): number => {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 360;
};

const createDefaultAvatar = (address: string): string => {
  const hue = generateColor(address);
  const svgString = DEFAULT_AVATAR_TEMPLATE
    .replace(/{ADDRESS}/g, address.slice(2, 10))
    .replace(/{HUE}/g, hue.toString())
    .trim();
  const encodedSvg = encodeURIComponent(svgString);
  return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
};

interface Comment {
  id: number;
  comment: string;
  userAddress: string;
  handle?: string;
  avatar?: string;
  truncatedComment?: string;
  needsTruncation?: boolean;
}

interface CommentSectionProps {
  token: any;
  commentsVisible: boolean;
  commentInputVisible: boolean;
  sortOrder: string;
  newComments: Record<string, string>;
  minting: Record<string, boolean>;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess?: boolean; // Add isSuccess to props
  handleMint: (tokenId: string) => void;
  mintQuantity: number;
  setCommentsVisible: (visible: boolean) => void; // Add to props
  setCommentInputVisible: (visible: boolean) => void;
  setSortOrder: (order: string) => void;
  setNewComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setMintQuantity: (quantity: number) => void;
  IPFS_GATEWAY: string;
  loadingComments?: boolean;
}

const CommentSection = ({
  token,
  commentsVisible,
  commentInputVisible,
  sortOrder,
  newComments,
  minting,
  isPending,
  isConfirming,
  isSuccess,
  handleMint,
  mintQuantity,
  setCommentsVisible,
  setCommentInputVisible,
  setSortOrder,
  setNewComments,
  setMintQuantity,
  IPFS_GATEWAY,
  loadingComments = false,
}: CommentSectionProps) => {
  const [processedComments, setProcessedComments] = useState<Comment[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [visibleComments, setVisibleComments] = useState(10);

  useEffect(() => {
    const container = document.querySelector(`#comment-loader-${token.tokenId}`);
    if (container) {
      lottie.loadAnimation({
        container: container as Element,
        animationData: loader,
        loop: true,
        autoplay: true,
      });
    }
  }, [token.tokenId, loadingComments]);

  // Reset comment input after successful mint
  useEffect(() => {
    if (isSuccess) {
      setCommentInputVisible(false); // Optionally collapse the input
    }
  }, [isSuccess, setCommentInputVisible]);

  const sortComments = useCallback((comments: any[]) => {
    return [...comments].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return 0; // No timestamp available
        case 'oldest':
          return 0; // No timestamp available
        case 'mostMinted':
          return 0; // No quantity available
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
    if (!token.comments || !Array.isArray(token.comments)) {
      setProcessedComments([]);
      return;
    }

    const sorted = sortComments(token.comments);
    const processed = sorted.map((comment, index) => ({
      ...comment,
      id: index,
      truncatedComment: comment.comment.slice(0, 500),
      needsTruncation: comment.comment.length > 500,
      avatar: comment.avatar || createDefaultAvatar(comment.userAddress || 'default'),
    }));
    setProcessedComments(processed);
  }, [token.comments, sortComments]);

  const toggleCommentExpansion = (commentId: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const showMoreComments = () => {
    setVisibleComments((prevVisible) => Math.min(prevVisible + 10, processedComments.length));
  };

  const toggleCommentsVisibility = () => {
    setCommentsVisible(!commentsVisible);
  };

  const truncateUsername = (handle: string, maxLength = 20) => {
    if (handle.length <= maxLength) return handle;
    return `${handle.slice(0, maxLength - 3)}...`;
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

      {loadingComments && (
        <div className="comments-loading">
          <div id={`comment-loader-${token.tokenId}`} style={{ width: 50, height: 50 }} />
          <p>Loading comments...</p>
        </div>
      )}

      {commentsVisible && !loadingComments && processedComments.length > 0 && (
        <ul className="comment-list">
          {processedComments.slice(0, visibleComments).map((comment, index) => (
            <li key={index} className="comment-item">
              <div className="comment-avatar">
                <img
                  src={comment.avatar}
                  alt="User avatar"
                  className="user-avatar"
                  onError={(e) => {
                    e.currentTarget.src = createDefaultAvatar(comment.userAddress || 'default');
                  }}
                />
              </div>
              <div className="comment-content">
                <a
                  href={`https://zora.co/${comment.userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="comment-address"
                  title={comment.userAddress}
                >
                  {truncateUsername(comment.handle || comment.userAddress.slice(0, 6))}
                </a>
                <p className="comment-text">
                  <ReactMarkdown>
                    {expandedComments[comment.id] || !comment.needsTruncation
                      ? comment.comment
                      : `${comment.truncatedComment}...`}
                  </ReactMarkdown>
                  {comment.needsTruncation && (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleCommentExpansion(comment.id);
                      }}
                      className="show-more-link"
                    >
                      {expandedComments[comment.id] ? 'Show less' : 'Show more'}
                    </a>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {commentsVisible && !loadingComments && processedComments.length === 0 && (
        <p>No comments yet.</p>
      )}
      {commentsVisible && processedComments.length > visibleComments && (
        <a
          href="#"
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
            value={newComments[token.tokenId] || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              setNewComments((prev) => ({
                ...prev,
                [token.tokenId]: newValue,
              }));
            }}
          />
        )}
      </div>
      <div className="comment-actions">
        <button className="hide-comments-button" onClick={toggleCommentsVisibility}>
          {commentsVisible ? 'Hide Comments' : `Show ${processedComments.length} Comments`}
        </button>
        <CommentButton
          handleMint={handleMint}
          tokenId={token.tokenId}
          minting={minting}
          isPending={isPending}
          isConfirming={isConfirming}
          expectedChainId={base.id}
          expectedNetworkName={base.name}
          commentText={newComments[token.tokenId] || ''}
        />
        <div className="mint-quantity-selector">
          <div className="quantity-display">{mintQuantity}x</div>
          <div className="quantity-controls">
            <button
              className="quantity-button increment"
              onClick={() => {
                const newQuantity = Math.min(mintQuantity + 1, 10);
                setMintQuantity(newQuantity);
              }}
              disabled={mintQuantity >= 10}
            >
              +
            </button>
            <button
              className="quantity-button decrement"
              onClick={() => {
                const newQuantity = Math.max(mintQuantity - 1, 1);
                setMintQuantity(newQuantity);
              }}
              disabled={mintQuantity <= 1}
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