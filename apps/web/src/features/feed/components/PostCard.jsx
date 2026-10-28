import { EyeOff } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '../../../components/Avatar.jsx';
import { paths } from '../../../lib/routing.js';
import { ExifBadges } from '../../posts/components/ExifBadges.jsx';
import { ReactionBar } from '../../reactions/components/ReactionBar.jsx';

/**
 * Media card: image flush to the edges, metadata on a gray shelf below.
 * The image and the description link to the detail; buttons stay separate
 * so there are no nested interactive elements.
 */
export function PostCard({
  post,
  showAuthor = true,
  canHide = false,
  reactionPending = false,
  reactionError = null,
  onReact,
  onRequestHide,
}) {
  const detailPath = paths.post(post.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-canvas shadow-card transition-all duration-200 hover:border-line-strong hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-raised">
        <Link to={detailPath} className="block h-full w-full" tabIndex={-1} aria-hidden="true">
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
        </Link>

        <div className="pointer-events-none absolute top-2.5 right-2.5 left-2.5">
          <ExifBadges exif={post.exif} className="opacity-95" />
        </div>

        {showAuthor && (
          <Link
            to={paths.profile(post.author.username)}
            className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded border border-line bg-canvas/90 px-2 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm transition-colors hover:bg-canvas"
          >
            <Avatar username={post.author.username} size="xs" />
            <span>@{post.author.username}</span>
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between border-t border-line bg-surface p-4">
        <div>
          <Link to={detailPath} className="block rounded-sm">
            {post.description ? (
              <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-body">
                {post.description}
              </p>
            ) : (
              <p className="mb-2 text-xs text-faint italic">Untitled photograph</p>
            )}
            <span className="sr-only">Open photo by @{post.author.username}</span>
          </Link>

          {post.tags.length > 0 && (
            <ul className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Tags">
              {post.tags.map((tag) => (
                <li key={tag} className="text-[11px] text-muted">
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <ReactionBar
            compact
            reactionsCount={post.reactionsCount}
            viewerReaction={post.viewerReaction}
            pending={reactionPending}
            onReact={(type) => onReact(post, type)}
            commentsCount={post.commentsCount}
            commentsTo={`${detailPath}#comments`}
          />

          {canHide && (
            <button
              type="button"
              onClick={() => onRequestHide(post.id)}
              title="Hide this work"
              className="rounded p-1 text-muted transition-colors hover:bg-danger-soft/30 hover:text-danger"
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Hide this work</span>
            </button>
          )}
        </div>

        {reactionError && (
          <p role="alert" className="mt-2 text-[11px] text-danger">
            {reactionError}
          </p>
        )}
      </div>
    </article>
  );
}
