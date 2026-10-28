import { validateRegistration } from '../../domain/users.js';
import { newId } from '../../lib/ids.js';
import { openSession } from './openSession.js';

export function createRegister({ users, sessions, passwordHasher, clock }) {
  /** @param {Record<string, unknown>} input */
  return async function register(input) {
    const now = clock.now();
    const data = validateRegistration(input, now);

    const user = {
      id: newId(),
      username: data.username,
      email: data.email,
      birthDate: data.birthDate,
      passwordHash: await passwordHasher.hash(data.password),
      createdAt: now.toISOString(),
    };
    await users.create(user);

    return openSession({ sessions, clock }, user);
  };
}
