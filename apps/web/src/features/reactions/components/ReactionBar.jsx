import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { REACTIONS } from '../reactionConfig.js';

/**
 * Like / Inspire / Wow buttons plus an optional comments link.
 * Clicking the active reaction does nothing: the MVP lets people change
 * their reaction, not remove it.
 */
export function ReactionBar({
  reactionsCount,
  viewerReaction,
  onReact,
  pending = false,
  compact = false,
  commentsCount,
  commentsTo,
}) {
  const size = compact ? 'px-2 py-1' : 'px-3 py-1.5';
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map(({ type, label, icon: Icon, activeText, activeSurface }) => {
        const isActive = viewerReaction === type;
        const count = reactionsCount?.[type] ?? 0;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={isActive}
            disabled={pending}
            onClick={() => onReact(type)}
            title={`${label} (${count})`}
            className={`group inline-flex items-center gap-1.5 rounded border text-xs font-medium transition-all disabled:cursor-wait disabled:opacity-60 ${size} ${
              isActive
                ? `${activeSurface} ${activeText} font-semibold`
                : 'border-line bg-canvas text-muted hover:bg-surface hover:text-ink'
            }`}
          >
            <Icon
              aria-hidden="true"
              className={`${iconSize} transition-transform group-hover:scale-110 ${
                isActive ? `${activeText} fill-current` : 'text-muted group-hover:text-ink'
              }`}
            />
            <span className={compact ? 'sr-only' : ''}>{label}</span>
            <span className="ml-0.5 font-mono text-[11px]">{count}</span>
          </button>
        );
      })}

      {commentsTo && (
        <Link
          to={commentsTo}
          title="View comments"
          className={`inline-flex items-center gap-1.5 rounded border border-line bg-canvas text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-ink ${size}`}
        >
          <MessageSquare className={iconSize} aria-hidden="true" />
          <span className={compact ? 'sr-only' : ''}>Comments</span>
          <span className="ml-0.5 font-mono text-[11px]">{commentsCount ?? 0}</span>
        </Link>
      )}
    </div>
  );
}
