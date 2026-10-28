import { normalizeUsername, toPublicUser } from '../../domain/users.js';
import { NotFoundError } from '../../lib/errors.js';

export function createGetProfile({ users }) {
  /** Public profile: username and join date only, never email or birth date. */
  return async function getProfile({ username }) {
    const user = await users.findByUsername(normalizeUsername(username));
    if (!user) throw new NotFoundError('This photographer does not exist.');
    return { user: toPublicUser(user) };
  };
}
