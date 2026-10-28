import { COMMENT_MAX_LENGTH } from '@flash/shared';
import { useCallback, useState } from 'react';
import { Alert } from '../../../components/Alert.jsx';
import { Spinner } from '../../../components/Spinner.jsx';
import { useCursorList } from '../../../hooks/useCursorList.js';
import { addComment, listComments } from '../../../lib/api/comments.js';
import { CommentForm } from './CommentForm.jsx';
import { CommentItem } from './CommentItem.jsx';

/**
 * Chronological comments (oldest first) with cursor pagination and the comment box.
 * Comments cannot be edited or deleted in the MVP.
 */
export function CommentsSection({ postId, commentsCount, isSignedIn, onCommentAdded }) {
  const fetchPage = useCallback((cursor) => listComments(postId, cursor), [postId]);
  const comments = useCursorList(fetchPage);
  const [postedOutOfView, setPostedOutOfView] = useState(false);

  const handleSubmit = async (content) => {
    const { comment } = await addComment(postId, content);
    // Comments are chronological: a new one belongs after the pages not loaded yet.
    if (comments.hasMore) setPostedOutOfView(true);
    else comments.appendItem(comment);
    onCommentAdded?.(comment);
  };

  return (
    <section
      id="comments"
      aria-labelledby="comments-title"
      className="scroll-mt-24 rounded-lg border border-line bg-canvas p-6"
    >
      <div className="mb-6 flex items-center justify-between border-b border-line pb-3">
        <h2 id="comments-title" className="font-headline text-base font-semibold text-ink">
          Conversation ({commentsCount})
        </h2>
        <span className="font-mono text-[11px] text-muted">
          Max {COMMENT_MAX_LENGTH} characters
        </span>
      </div>

      {comments.isLoading && (
        <div className="flex justify-center py-8">
          <Spinner label="Loading comments" />
        </div>
      )}

      {comments.status === 'error' && <Alert variant="error">{comments.error.message}</Alert>}

      {!comments.isLoading && comments.status !== 'error' && comments.items.length === 0 && (
        <p className="py-8 text-center text-xs text-muted">
          No comments yet. Be the first to share an impression.
        </p>
      )}

      {comments.items.length > 0 && (
        <ol className="mb-6 space-y-4">
          {comments.items.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </ol>
      )}

      {comments.hasMore && (
        <div className="mb-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={comments.loadMore}
            disabled={comments.isLoadingMore}
            className="rounded border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised disabled:opacity-60"
          >
            {comments.isLoadingMore ? 'Loading...' : 'Load more comments'}
          </button>
          {comments.loadMoreError && (
            <p className="text-[11px] text-danger">{comments.loadMoreError.message}</p>
          )}
        </div>
      )}

      {postedOutOfView && comments.hasMore && (
        <Alert variant="success" className="mb-4">
          Your comment was posted. It appears at the end of the conversation.
        </Alert>
      )}

      <CommentForm isSignedIn={isSignedIn} onSubmit={handleSubmit} />
    </section>
  );
}
