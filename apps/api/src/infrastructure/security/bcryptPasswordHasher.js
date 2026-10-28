import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * bcrypt password hashing (pure JS implementation, no native build).
 * @param {{ cost: number }} options
 * @returns {import('../../application/ports.js').PasswordHasher}
 */
export function createBcryptPasswordHasher({ cost }) {
  let dummyHash = null;

  return {
    hash(password) {
      return bcrypt.hash(password, cost);
    },

    async verify(password, hash) {
      if (!hash) {
        // Spend the same time as a real check so unknown accounts are not revealed.
        dummyHash ??= await bcrypt.hash(randomBytes(16).toString('hex'), cost);
        await bcrypt.compare(password, dummyHash);
        return false;
      }
      return bcrypt.compare(password, hash);
    },
  };
}
