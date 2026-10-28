import { ValidationError } from './errors.js';

/**
 * Pagination cursors are opaque to clients: base64url-encoded JSON.
 * @param {Record<string, unknown> | null | undefined} value
 * @returns {string | null}
 */
export function encodeCursor(value) {
  if (!value) return null;
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/**
 * Decodes and validates a cursor. Every key in `shape` must be present as a
 * string, and no other keys are allowed, so a tampered cursor cannot point
 * the query at another partition.
 * @param {string | undefined | null} cursor
 * @param {string[]} shape
 * @returns {Record<string, string> | undefined}
 */
export function decodeCursor(cursor, shape) {
  if (cursor === undefined || cursor === null || cursor === '') return undefined;
  const invalid = () => new ValidationError('Invalid cursor.', { cursor: 'Invalid cursor.' });

  if (typeof cursor !== 'string' || cursor.length > 1024) throw invalid();

  let value;
  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const keys = Object.keys(value);
  if (keys.length !== shape.length) throw invalid();
  for (const key of shape) {
    if (typeof value[key] !== 'string' || value[key].length === 0) throw invalid();
  }
  return value;
}
