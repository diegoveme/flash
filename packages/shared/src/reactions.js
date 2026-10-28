/** Allowed reaction values. One reaction per user per post. */
export const REACTION_TYPES = Object.freeze(['like', 'inspire', 'wow']);

/**
 * @param {unknown} value
 * @returns {value is 'like' | 'inspire' | 'wow'}
 */
export function isReactionType(value) {
  return typeof value === 'string' && REACTION_TYPES.includes(value);
}

/** @returns {{ like: number, inspire: number, wow: number }} */
export function emptyReactionCounts() {
  return { like: 0, inspire: 0, wow: 0 };
}
