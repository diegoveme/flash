import { Calendar, ShieldCheck } from 'lucide-react';
import { Avatar } from '../../../components/Avatar.jsx';
import { formatMonthYear } from '../../../lib/format/date.js';

/** Public profile header. Only public fields exist here: no email, no birth date. */
export function ProfileHeader({ profile, isSelf }) {
  return (
    <section className="mb-8 rounded-lg border border-line bg-canvas p-6 sm:p-8">
      <div className="flex items-center gap-5">
        <Avatar username={profile.username} size="xl" className="border-2 shadow-sm" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl font-bold text-ink">@{profile.username}</h1>
            {isSelf && (
              <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                You
              </span>
            )}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              Joined <time dateTime={profile.createdAt}>{formatMonthYear(profile.createdAt)}</time>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-medium text-success">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Private data never shown
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
