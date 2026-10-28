export function createLogout({ sessions, clock }) {
  /** Revokes the current session on the server; the token stops working right away. */
  return async function logout({ viewer }) {
    await sessions.revoke(viewer.session.tokenHash, clock.now().toISOString());
  };
}
