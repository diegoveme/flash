import { http } from './instance.js';

/**
 * Creates or changes the viewer's reaction (one per user per post).
 * @param {string} postId
 * @param {'like' | 'inspire' | 'wow'} type
 */
export const setReaction = (postId, type) =>
  http.put(`/posts/${encodeURIComponent(postId)}/reaction`, { type });
