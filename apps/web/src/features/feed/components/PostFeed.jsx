import { FEED_PAGE_SIZE } from '@flash/shared';
import { Camera } from 'lucide-react';
import { Alert } from '../../../components/Alert.jsx';
import { EmptyState } from '../../../components/EmptyState.jsx';
import { LoadMore } from '../../../components/LoadMore.jsx';
import { LoadingState } from '../../../components/Spinner.jsx';
import { useAuth } from '../../../app/providers/authContext.js';
import { useCursorList } from '../../../hooks/useCursorList.js';
import { HidePostDialog } from '../../posts/components/HidePostDialog.jsx';
import { useHidePost } from '../../posts/hooks/useHidePost.js';
import { useReactToPost } from '../../reactions/hooks/useReactToPost.js';
import { PostCard } from './PostCard.jsx';

/**
 * Reverse-chronological grid with cursor pagination. Used by the global feed
 * and by public profiles (the same feed filtered by user).
 *
 * @param {object} props
 * @param {(cursor: string | null) => Promise<{ items: object[], nextCursor: string | null }>} props.fetchPage
 *   Must be stable (module function or useCallback).
 * @param {boolean} [props.showAuthor]
 * @param {import('react').ReactNode} [props.empty]
 */
export function PostFeed({ fetchPage, showAuthor = true, empty }) {
  const { user } = useAuth();
  const feed = useCursorList(fetchPage);
  const reactions = useReactToPost(feed.updateItem);
  const hide = useHidePost();

  const handleConfirmHide = async () => {
    const hiddenId = await hide.confirm();
    if (hiddenId) feed.removeItem(hiddenId);
  };

  if (feed.isLoading) return <LoadingState label="Loading photos" />;
  if (feed.status === 'error') return <Alert variant="error">{feed.error.message}</Alert>;

  if (feed.items.length === 0) {
    return (
      empty ?? (
        <EmptyState
          icon={Camera}
          title="No photos yet"
          description="When members publish their work it will show up here, newest first."
        />
      )
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {feed.items.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showAuthor={showAuthor}
            canHide={user?.id === post.author.id}
            reactionPending={reactions.pendingPostId === post.id}
            reactionError={reactions.error?.postId === post.id ? reactions.error.message : null}
            onReact={reactions.react}
            onRequestHide={hide.request}
          />
        ))}
      </div>

      <LoadMore
        hasMore={feed.hasMore}
        loading={feed.isLoadingMore}
        error={feed.loadMoreError}
        onLoadMore={feed.loadMore}
        label={`Load next ${FEED_PAGE_SIZE}`}
        endLabel="All photos loaded"
        summary={
          <>
            Showing <span className="font-semibold text-ink">{feed.items.length}</span>{' '}
            {feed.items.length === 1 ? 'photo' : 'photos'}
          </>
        }
      />

      <HidePostDialog
        open={Boolean(hide.targetPostId)}
        busy={hide.busy}
        error={hide.error}
        onConfirm={handleConfirmHide}
        onCancel={hide.cancel}
      />
    </>
  );
}
