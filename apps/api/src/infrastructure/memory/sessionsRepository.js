import { clone } from './memoryDatabase.js';

/** @returns {import('../../application/ports.js').SessionsRepository} */
export function createMemorySessionsRepository(db) {
  const { state } = db;

  return {
    async create(session) {
      state.sessions[session.tokenHash] = clone(session);
      db.persist();
    },

    async findByTokenHash(tokenHash) {
      return clone(state.sessions[tokenHash]);
    },

    async revoke(tokenHash, revokedAt) {
      const session = state.sessions[tokenHash];
      if (!session) return;
      session.revoked = true;
      session.revokedAt = revokedAt;
      db.persist();
    },
  };
}
