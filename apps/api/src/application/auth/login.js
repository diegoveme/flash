import { normalizeEmail, normalizeUsername } from '../../domain/users.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { openSession } from './openSession.js';

const INVALID_CREDENTIALS = 'Invalid username, email or password.';

export function createLogin({ users, sessions, passwordHasher, clock }) {
  /** @param {{ identifier?: unknown, password?: unknown }} input */
  return async function login(input) {
    const raw = typeof input?.identifier === 'string' ? input.identifier : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!raw.trim() || !password) {
      throw new ValidationError('Enter your username or email and your password.');
    }

    const isEmail = raw.includes('@');
    const user = isEmail
      ? await users.findByEmail(normalizeEmail(raw))
      : await users.findByUsername(normalizeUsername(raw));

    // Always run bcrypt, even for unknown users, so timing does not reveal accounts.
    const valid = await passwordHasher.verify(password, user?.passwordHash);
    if (!user || !valid) throw new UnauthorizedError(INVALID_CREDENTIALS);

    return openSession({ sessions, clock }, user);
  };
}
