import { TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { EmptyState } from '../../components/EmptyState.jsx';

/** Last-resort screen for unexpected rendering errors. */
export function RouteError() {
  const error = useRouteError();
  const description = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong while showing this page. Please try again.';

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={TriangleAlert}
        title="Unexpected error"
        description={description}
        action={
          <Link
            to="/"
            reloadDocument
            className="inline-block rounded border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised"
          >
            Reload the feed
          </Link>
        }
      />
    </div>
  );
}
