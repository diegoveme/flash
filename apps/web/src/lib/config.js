const DEFAULT_API_URL = 'http://localhost:3001';

/** Base URL of the Flash API, without a trailing slash. */
export const API_URL = (import.meta.env?.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
