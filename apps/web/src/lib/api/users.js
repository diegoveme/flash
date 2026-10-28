import { http } from './instance.js';

/** @param {string} username */
export const getProfile = (username) => http.get(`/users/${encodeURIComponent(username)}`);

/**
 * @param {string} username
 * @param {string | null} [cursor]
 */
export const listUserPosts = (username, cursor) =>
  http.get(`/users/${encodeURIComponent(username)}/posts`, { query: { cursor } });
