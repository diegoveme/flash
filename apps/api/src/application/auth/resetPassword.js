import { passwordProblem } from '../../domain/users.js';
import { ValidationError } from '../../lib/errors.js';
import { hashToken } from '../../lib/ids.js';

const invalidToken = () =>
  new ValidationError('This reset link is invalid or has expired. Ask for a new one.', {
    token: 'Invalid or expired token.',
  });

export function createResetPassword({ users, passwordResets, passwordHasher }) {
  /** @param {{ token?: unknown, password?: unknown }} input */
  return async function resetPassword(input) {
    const token = typeof input?.token === 'string' ? input.token.trim() : '';

    // Validate the new password first so a weak password does not burn the token.
    const problem = passwordProblem(input?.password);
    if (problem) throw new ValidationError('Choose a stronger password.', { password: problem });
    if (!token) throw invalidToken();

    const userId = await passwordResets.consume(hashToken(token));
    if (!userId) throw invalidToken();

    await users.updatePasswordHash(userId, await passwordHasher.hash(input.password));
  };
}
