/**
 * Error thrown for any failed API call. Mirrors the API error body:
 * { error: { code, message, fields } }.
 */
export class ApiError extends Error {
  /**
   * @param {{ status: number, code: string, message: string, fields?: Record<string, string> }} init
   */
  constructor({ status, code, message, fields = {} }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR';

const FALLBACK_MESSAGES = {
  400: 'The request is not valid.',
  401: 'Your session is not valid. Please sign in again.',
  403: 'You are not allowed to do that.',
  404: 'We could not find what you were looking for.',
  409: 'That value is already in use.',
  413: 'The file is too large.',
  415: 'That file type is not supported.',
};

const FALLBACK_CODES = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

/**
 * Builds an ApiError from a status code and a parsed body (if any).
 * @param {number} status
 * @param {unknown} body
 */
export function toApiError(status, body) {
  const error = body && typeof body === 'object' ? body.error : undefined;
  return new ApiError({
    status,
    code: error?.code || FALLBACK_CODES[status] || 'INTERNAL_ERROR',
    message:
      error?.message || FALLBACK_MESSAGES[status] || 'Something went wrong. Please try again.',
    fields: error?.fields && typeof error.fields === 'object' ? error.fields : {},
  });
}

function buildUrl(baseUrl, path, query) {
  const url = `${baseUrl}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

async function readBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Small fetch wrapper for the Flash API.
 *
 * @param {object} options
 * @param {string} options.baseUrl
 * @param {() => string | null} options.getToken  Returns the current session token.
 * @param {(error: ApiError) => void} [options.onUnauthorized]
 *   Called when a request that carried a token gets a 401 (expired or revoked session).
 */
export function createApiClient({ baseUrl, getToken, onUnauthorized }) {
  async function request(method, path, { body, query, signal } = {}) {
    const headers = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await globalThis.fetch(buildUrl(baseUrl, path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (cause) {
      if (cause?.name === 'AbortError') throw cause;
      throw new ApiError({
        status: 0,
        code: NETWORK_ERROR,
        message: 'Could not reach the server. Check your connection and try again.',
      });
    }

    const data = await readBody(response);
    if (response.ok) return data;

    const error = toApiError(response.status, data);
    if (response.status === 401 && token && onUnauthorized) onUnauthorized(error);
    throw error;
  }

  return {
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };
}
