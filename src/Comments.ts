import React from 'react';
import { useZoraUsername } from './useZoraUsername';

interface CommentProps {
  comment: {
    fromAddress: string;
    comment: string;
  };
}

const Comment: React.FC<CommentProps> = ({ comment }) => {
  const { username, loading } = useZoraUsername(comment.fromAddress);

  return (
    <div className="comment-item">
      <div className="comment-content">
        <span className="comment-address">
          {loading ? 'Loading...' : username || comment.fromAddress}
        </span>
        <p className="comment-text">{comment.comment}</p>
      </div>
    </div>
  );
};

export default Comment;
