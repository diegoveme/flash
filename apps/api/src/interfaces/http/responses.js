import { AppError } from '../../lib/errors.js';

const BASE_HEADERS = Object.freeze({
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
});

/**
 * @param {number} statusCode
 * @param {unknown} [body]
 */
export function json(statusCode, body) {
  if (body === undefined) return { statusCode, headers: { ...BASE_HEADERS } };
  return {
    statusCode,
    headers: { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

export const ok = (body) => json(200, body);
export const created = (body) => json(201, body);
export const accepted = (body) => json(202, body);
export const noContent = () => json(204);

/**
 * Maps errors to the public error format. Unknown errors never expose details.
 * @param {unknown} error
 */
export function errorResponse(error) {
  if (error instanceof AppError) {
    return json(error.status, {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
  }
  return json(500, {
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Try again later.' },
  });
}

/** @param {string} origin */
export function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}
