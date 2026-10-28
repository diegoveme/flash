import { useCallback, useEffect, useState } from 'react';

function mergeById(current, incoming) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
}

/**
 * Cursor pagination over an API list ({ items, nextCursor }).
 * `fetchPage` must be stable (wrap it in useCallback). To restart the list
 * (for example when the viewer signs in), remount the component with a new key.
 *
 * @template T
 * @param {(cursor: string | null) => Promise<{ items: T[], nextCursor: string | null }>} fetchPage
 */
export function useCursorList(fetchPage) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);

  useEffect(() => {
    let active = true;
    fetchPage(null).then(
      (page) => {
        if (!active) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setStatus('ready');
      },
      (err) => {
        if (!active) return;
        setError(err);
        setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === 'loading-more') return;
    setStatus('loading-more');
    setLoadMoreError(null);
    try {
      const page = await fetchPage(nextCursor);
      setItems((current) => mergeById(current, page.items));
      setNextCursor(page.nextCursor);
    } catch (err) {
      setLoadMoreError(err);
    } finally {
      setStatus('ready');
    }
  }, [fetchPage, nextCursor, status]);

  const updateItem = useCallback((id, patch) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const appendItem = useCallback((item) => {
    setItems((current) => mergeById(current, [item]));
  }, []);

  return {
    items,
    status,
    error,
    loadMoreError,
    hasMore: Boolean(nextCursor),
    isLoading: status === 'loading',
    isLoadingMore: status === 'loading-more',
    loadMore,
    updateItem,
    removeItem,
    appendItem,
    setItems,
  };
}
