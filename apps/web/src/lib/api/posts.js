import { http } from './instance.js';

/** @param {string | null} [cursor] */
export const listFeed = (cursor) => http.get('/posts', { query: { cursor } });

/** @param {string} postId */
export const getPost = (postId) => http.get(`/posts/${encodeURIComponent(postId)}`);

/** @param {{ uploadId: string, description?: string, tags?: string[], exif?: object }} body */
export const createPost = (body) => http.post('/posts', body);

/** Logical delete: the API sets visible = false. */
export const hidePost = (postId) => http.delete(`/posts/${encodeURIComponent(postId)}`);
