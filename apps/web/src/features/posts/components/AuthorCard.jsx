import { Clock } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '../../../components/Avatar.jsx';
import { formatDate } from '../../../lib/format/date.js';
import { paths } from '../../../lib/routing.js';

export function AuthorCard({ author, createdAt }) {
  return (
    <section className="rounded-lg border border-line bg-canvas p-5" aria-label="Photographer">
      <div className="flex items-center gap-3.5">
        <Avatar username={author.username} size="lg" />
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
            Photographer
          </span>
          <h2 className="truncate font-headline text-base font-bold text-ink">
            @{author.username}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>
              Published on <time dateTime={createdAt}>{formatDate(createdAt)}</time>
            </span>
          </p>
        </div>
      </div>

      <Link
        to={paths.profile(author.username)}
        className="mt-4 block w-full rounded border border-line bg-surface px-3 py-2 text-center text-xs font-semibold text-ink transition-colors hover:bg-surface-raised"
      >
        View full gallery
      </Link>
    </section>
  );
}
