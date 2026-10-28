import { API_URL } from '../config.js';
import { tokenStorage } from '../session/tokenStorage.js';
import { createApiClient } from './client.js';

const unauthorizedListeners = new Set();

/**
 * Subscribes to "session no longer valid" events (401 on a request that sent a token).
 * @param {(error: import('./client.js').ApiError) => void} listener
 * @returns {() => void} unsubscribe
 */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

/** Shared client used by every endpoint module. */
export const http = createApiClient({
  baseUrl: API_URL,
  getToken: tokenStorage.getToken,
  onUnauthorized: (error) => {
    for (const listener of unauthorizedListeners) listener(error);
  },
});
