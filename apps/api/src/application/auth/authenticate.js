import { isSessionActive } from '../../domain/sessions.js';
import { hashToken } from '../../lib/ids.js';

export function createAuthenticate({ sessions, clock }) {
  /**
   * Resolves a bearer token into the viewer, or null when the session is
   * missing, revoked or older than 24 hours. Runs on every request that
   * carries a token.
   * @param {string | undefined} token
   */
  return async function authenticate(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) return null;

    const session = await sessions.findByTokenHash(hashToken(token));
    if (!isSessionActive(session, clock.now())) return null;

    return { id: session.userId, username: session.username, session };
  };
}
