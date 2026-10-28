import { FEED_PAGE_SIZE } from '@flash/shared';
import { Camera } from 'lucide-react';
import { useAuth } from '../../app/providers/authContext.js';
import { LoadingState } from '../../components/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listFeed } from '../../lib/api/posts.js';
import { PostFeed } from './components/PostFeed.jsx';

/** Screen 2: public feed, newest first, 12 per page with a cursor. */
export function FeedScreen() {
  const { status, user } = useAuth();
  useDocumentTitle('Feed');

  return (
    <div className="mx-auto max-w-7xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-widest text-primary uppercase">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Community feed</span>
          </p>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Exhibition Stream
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-subtle">
            Photographs shared by the community, newest first, with the technical EXIF data behind
            each shot.
          </p>
        </div>
        <span className="font-mono text-xs whitespace-nowrap text-muted">
          {FEED_PAGE_SIZE} per page
        </span>
      </header>

      {status === 'checking' ? (
        <LoadingState label="Loading photos" />
      ) : (
        // A new key restarts the list when the viewer changes, so viewer reactions are fresh.
        <PostFeed key={user?.id ?? 'visitor'} fetchPage={listFeed} />
      )}
    </div>
  );
}
