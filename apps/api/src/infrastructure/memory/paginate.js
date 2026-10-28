import { decodeCursor, encodeCursor } from '../../lib/cursor.js';

// Binary order, like DynamoDB sort keys (not locale aware).
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Cursor pagination over an in-memory list. The cursor stores the sort key of
 * the last item, so pages stay stable when items are added or hidden.
 * @template T
 * @param {T[]} items
 * @param {{ cursor?: string, limit: number, keyOf: (item: T) => string, order: 'asc' | 'desc' }} options
 */
export function paginate(items, { cursor, limit, keyOf, order }) {
  const after = decodeCursor(cursor, ['after'])?.after;
  const direction = order === 'asc' ? 1 : -1;

  const sorted = [...items].sort((a, b) => direction * compare(keyOf(a), keyOf(b)));
  const remaining =
    after === undefined
      ? sorted
      : sorted.filter((item) => direction * compare(keyOf(item), after) > 0);

  const page = remaining.slice(0, limit);
  const nextCursor = remaining.length > limit ? encodeCursor({ after: keyOf(page.at(-1)) }) : null;
  return { items: page, nextCursor };
}

export const chronologicalKey = (item) => `${item.createdAt}#${item.id}`;
