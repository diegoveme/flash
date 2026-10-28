import { createHash, randomBytes, randomUUID } from 'node:crypto';

/** Unique identifier for users, posts, comments, notifications and uploads. */
export function newId() {
  return randomUUID();
}

/** Opaque, unguessable token (256 bits) for sessions and password recovery. */
export function newToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * Tokens are stored only as SHA-256 hashes, so a database leak does not leak
 * usable tokens. High-entropy random tokens do not need a slow hash.
 * @param {string} token
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
