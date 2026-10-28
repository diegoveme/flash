const tokenKey = (tokenHash) => `flash:pwreset:${tokenHash}`;
const userKey = (userId) => `flash:pwreset:user:${userId}`;

/**
 * Password recovery tokens in Redis/Valkey: expire after the TTL and are
 * consumed atomically with GETDEL, so each token works exactly once.
 * @param {() => Promise<import('redis').RedisClientType>} getClient
 * @returns {import('../../application/ports.js').PasswordResetStore}
 */
export function createRedisPasswordResetStore(getClient) {
  return {
    async save(tokenHash, userId, ttlSeconds) {
      const client = await getClient();
      const expiration = { type: 'EX', value: ttlSeconds };
      const previous = await client.get(userKey(userId));

      const transaction = client.multi();
      if (previous) transaction.del(tokenKey(previous));
      transaction.set(tokenKey(tokenHash), userId, { expiration });
      transaction.set(userKey(userId), tokenHash, { expiration });
      await transaction.exec();
    },

    async consume(tokenHash) {
      const client = await getClient();
      const userId = await client.getDel(tokenKey(tokenHash));
      if (!userId) return null;
      await client.del(userKey(userId));
      return userId;
    },
  };
}
