import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={Compass}
        title="This page does not exist"
        description="The link may be broken or the page may have moved."
        action={
          <Link
            to="/"
            className="inline-block rounded border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised"
          >
            Back to the feed
          </Link>
        }
      />
    </div>
  );
}
