import { http } from './instance.js';

/** @param {string | null} [cursor] */
export const listNotifications = (cursor) => http.get('/notifications', { query: { cursor } });

export const getUnreadCount = () => http.get('/notifications/unread-count');

export const markAllRead = () => http.post('/notifications/read-all');
