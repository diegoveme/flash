import { ChevronDown } from 'lucide-react';
import { Spinner } from './Spinner.jsx';

/**
 * Footer for cursor-paginated lists: "Load more" while there is a next cursor,
 * a quiet end-of-list note otherwise.
 */
export function LoadMore({
  hasMore,
  loading,
  error,
  onLoadMore,
  label = 'Load more',
  endLabel = 'You reached the end.',
  summary,
}) {
  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
      <div className="text-xs text-muted">{summary}</div>

      <div className="flex flex-col items-center gap-2 sm:items-end">
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? (
              <Spinner label="Loading" className="text-white [&_svg]:text-white" />
            ) : (
              <>
                <span>{label}</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        ) : (
          <p className="text-xs font-medium text-faint italic">{endLabel}</p>
        )}
        {error && <p className="text-[11px] text-danger">{error.message}</p>}
      </div>
    </div>
  );
}
