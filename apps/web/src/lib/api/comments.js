import { http } from './instance.js';

/**
 * @param {string} postId
 * @param {string | null} [cursor]
 */
export const listComments = (postId, cursor) =>
  http.get(`/posts/${encodeURIComponent(postId)}/comments`, { query: { cursor } });

/**
 * @param {string} postId
 * @param {string} content
 */
export const addComment = (postId, content) =>
  http.post(`/posts/${encodeURIComponent(postId)}/comments`, { content });
