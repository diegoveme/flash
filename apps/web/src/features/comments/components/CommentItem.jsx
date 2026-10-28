import { Link } from 'react-router';
import { Avatar } from '../../../components/Avatar.jsx';
import { formatDateTime } from '../../../lib/format/date.js';
import { paths } from '../../../lib/routing.js';

export function CommentItem({ comment }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3">
      <Avatar username={comment.author.username} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link
            to={paths.profile(comment.author.username)}
            className="text-xs font-semibold text-ink transition-colors hover:text-primary"
          >
            @{comment.author.username}
          </Link>
          <time dateTime={comment.createdAt} className="font-mono text-[10px] text-muted">
            {formatDateTime(comment.createdAt)}
          </time>
        </div>
        <p className="mt-1 text-xs leading-relaxed break-words whitespace-pre-line text-body">
          {comment.content}
        </p>
      </div>
    </li>
  );
}
