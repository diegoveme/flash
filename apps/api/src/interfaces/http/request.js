import { PayloadTooLargeError, ValidationError } from '../../lib/errors.js';

export const MAX_JSON_BODY_BYTES = 64 * 1024;

/**
 * Normalizes an API Gateway HTTP API (payload v2) event.
 * @param {Record<string, any>} event
 */
export function parseRequest(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    headers,
    params: event.pathParameters ?? {},
    query: event.queryStringParameters ?? {},
    body: parseBody(event),
  };
}

function parseBody(event) {
  if (event.body === undefined || event.body === null || event.body === '') return {};

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  if (Buffer.byteLength(raw, 'utf8') > MAX_JSON_BODY_BYTES) {
    throw new PayloadTooLargeError('Request body too large.');
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ValidationError('The request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('The request body must be a JSON object.');
  }
  return body;
}

/** @param {Record<string, string>} headers */
export function bearerToken(headers) {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.authorization ?? '');
  return match ? match[1] : undefined;
}
