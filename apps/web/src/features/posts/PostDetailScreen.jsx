import { ArrowLeft, EyeOff, ImageOff, Maximize2, Tag } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../app/providers/authContext.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingState } from '../../components/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { paths } from '../../lib/routing.js';
import { CommentsSection } from '../comments/components/CommentsSection.jsx';
import { ReactionBar } from '../reactions/components/ReactionBar.jsx';
import { useReactToPost } from '../reactions/hooks/useReactToPost.js';
import { AuthorCard } from './components/AuthorCard.jsx';
import { ExifTable } from './components/ExifTable.jsx';
import { HidePostDialog } from './components/HidePostDialog.jsx';
import { Lightbox } from './components/Lightbox.jsx';
import { useHidePost } from './hooks/useHidePost.js';
import { usePost } from './hooks/usePost.js';

const backLinkClass =
  'inline-flex items-center gap-2 text-xs font-semibold text-ink transition-colors hover:text-primary';

/** Screen 4: photo, EXIF, chronological comments and reactions. */
export function PostDetailScreen() {
  const { postId } = useParams();
  const { status, user } = useAuth();

  if (status === 'checking') return <LoadingState label="Loading photo" />;
  // Remount when the post or the viewer changes so viewer data is fetched again.
  return <PostDetail key={`${postId}:${user?.id ?? 'visitor'}`} postId={postId} />;
}

function PostDetail({ postId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { post, status, error, updatePost } = usePost(postId);
  const [showLightbox, setShowLightbox] = useState(false);
  const hide = useHidePost();

  const handleReactionUpdated = useCallback((_postId, patch) => updatePost(patch), [updatePost]);
  const reactions = useReactToPost(handleReactionUpdated);

  useDocumentTitle(post ? `Photo by @${post.author.username}` : 'Photo');

  if (status === 'loading') return <LoadingState label="Loading photo" />;

  if (status === 'not-found' || status === 'error') {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={ImageOff}
          title={
            status === 'not-found' ? 'This photo is not available' : 'Could not load this photo'
          }
          description={
            status === 'not-found'
              ? 'It may have been hidden by its author or the link may be wrong.'
              : error?.message
          }
          action={
            <Link to={paths.feed()} className={backLinkClass}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to the feed
            </Link>
          }
        />
      </div>
    );
  }

  const isAuthor = user?.id === post.author.id;

  const handleConfirmHide = async () => {
    const hiddenId = await hide.confirm();
    if (hiddenId) navigate(paths.feed(), { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b border-line pb-6">
        <Link to={paths.feed()} className={backLinkClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to the feed</span>
        </Link>

        {isAuthor && (
          <button
            type="button"
            onClick={() => hide.request(post.id)}
            className="inline-flex items-center gap-1.5 rounded bg-danger-soft/30 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft/60"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hide this work</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col space-y-6 lg:col-span-7">
          <div className="group relative overflow-hidden rounded-lg border border-line bg-canvas shadow-sm">
            <img
              src={post.imageUrl}
              alt={post.description || `Photograph by @${post.author.username}`}
              className="h-auto max-h-[70vh] w-full bg-surface object-contain"
            />
            <button
              type="button"
              onClick={() => setShowLightbox(true)}
              title="View full size"
              className="absolute right-3 bottom-3 rounded bg-black/60 p-2 text-white shadow-md backdrop-blur-sm transition-all hover:bg-black/80"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">View full size</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <ReactionBar
              reactionsCount={post.reactionsCount}
              viewerReaction={post.viewerReaction}
              pending={reactions.pendingPostId === post.id}
              onReact={(type) => reactions.react(post, type)}
            />
            <span className="font-mono text-[11px] text-muted">One reaction per member</span>
            {reactions.error && (
              <p role="alert" className="w-full text-[11px] text-danger">
                {reactions.error.message}
              </p>
            )}
          </div>

          <section
            className="rounded-lg border border-line bg-canvas p-6"
            aria-labelledby="notes-title"
          >
            <h2 id="notes-title" className="mb-2 font-headline text-lg font-semibold text-ink">
              Photographer notes
            </h2>
            {post.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-body">
                {post.description}
              </p>
            ) : (
              <p className="text-sm text-faint italic">
                The photographer shared this work without a description.
              </p>
            )}

            {post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Tag className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                <span className="sr-only">Tags:</span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[2px] bg-primary-soft/30 px-2 py-0.5 font-mono text-xs text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <CommentsSection
            postId={post.id}
            commentsCount={post.commentsCount}
            isSignedIn={Boolean(user)}
            onCommentAdded={() =>
              updatePost((current) => ({ commentsCount: current.commentsCount + 1 }))
            }
          />
        </div>

        <aside className="flex flex-col space-y-6 lg:col-span-5">
          <AuthorCard author={post.author} createdAt={post.createdAt} />
          <ExifTable exif={post.exif} />
        </aside>
      </div>

      {showLightbox && <Lightbox post={post} onClose={() => setShowLightbox(false)} />}

      <HidePostDialog
        open={Boolean(hide.targetPostId)}
        busy={hide.busy}
        error={hide.error}
        onConfirm={handleConfirmHide}
        onCancel={hide.cancel}
      />
    </div>
  );
}
