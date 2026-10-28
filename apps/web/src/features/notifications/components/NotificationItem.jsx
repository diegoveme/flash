import { ArrowRight, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '../../../components/Avatar.jsx';
import { daysUntil, formatTimeAgo } from '../../../lib/format/date.js';
import { paths } from '../../../lib/routing.js';
import { reactionConfig } from '../../reactions/reactionConfig.js';

function Action({ notification }) {
  if (notification.type === 'reaction') {
    const config = reactionConfig(notification.reactionType);
    const Icon = config?.icon;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-subtle">
        reacted with
        {Icon && (
          <Icon className={`h-3.5 w-3.5 fill-current ${config.activeText}`} aria-hidden="true" />
        )}
        <strong>{config?.label ?? notification.reactionType}</strong>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-subtle">
      <MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      commented:
    </span>
  );
}

export function NotificationItem({ notification, now }) {
  const daysLeft = daysUntil(notification.expiresAt, now);

  return (
    <li>
      <Link
        to={paths.post(notification.post.id)}
        className={`flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface ${
          notification.read ? 'bg-canvas' : 'bg-surface-raised/50'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar username={notification.actor.username} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {!notification.read && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              )}
              <span className="text-xs font-semibold text-ink">@{notification.actor.username}</span>
              <Action notification={notification} />
              {!notification.read && <span className="sr-only">(unread)</span>}
            </div>

            {notification.type === 'comment' && notification.commentSnippet && (
              <p className="mt-1 line-clamp-1 text-xs text-body italic">
                &ldquo;{notification.commentSnippet}&rdquo;
              </p>
            )}

            <p className="mt-1 flex items-center gap-2 text-[11px] text-muted">
              <time dateTime={notification.createdAt}>
                {formatTimeAgo(notification.createdAt, now)}
              </time>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[10px]">
                Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {notification.post.imageUrl ? (
            <img
              src={notification.post.imageUrl}
              alt=""
              loading="lazy"
              className="h-12 w-12 rounded border border-line object-cover"
            />
          ) : (
            <span className="hidden text-[10px] text-faint sm:inline">
              Photo no longer available
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-faint" aria-hidden="true" />
        </div>
      </Link>
    </li>
  );
}
