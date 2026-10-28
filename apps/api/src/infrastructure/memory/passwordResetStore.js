/**
 * In-memory stand-in for the Redis password reset store, with the same
 * semantics: expiring keys, single use, one live token per user.
 * @param {{ clock: import('../../lib/clock.js').Clock }} deps
 * @returns {import('../../application/ports.js').PasswordResetStore}
 */
export function createMemoryPasswordResetStore({ clock }) {
  const tokens = new Map();
  const latestByUser = new Map();

  return {
    async save(tokenHash, userId, ttlSeconds) {
      const previous = latestByUser.get(userId);
      if (previous) tokens.delete(previous);
      tokens.set(tokenHash, { userId, expiresAt: clock.now().getTime() + ttlSeconds * 1000 });
      latestByUser.set(userId, tokenHash);
    },

    async consume(tokenHash) {
      const entry = tokens.get(tokenHash);
      tokens.delete(tokenHash);
      if (!entry || entry.expiresAt <= clock.now().getTime()) return null;
      latestByUser.delete(entry.userId);
      return entry.userId;
    },
  };
}
