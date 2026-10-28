import { toPublicUser } from '../../domain/users.js';
import { UnauthorizedError } from '../../lib/errors.js';

export function createGetCurrentUser({ users }) {
  return async function getCurrentUser({ viewer }) {
    const user = await users.findById(viewer.id);
    if (!user) throw new UnauthorizedError();
    return { user: toPublicUser(user), expiresAt: viewer.session.expiresAt };
  };
}
