import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentSession, logout } from '../../lib/api/auth.js';
import { onUnauthorized } from '../../lib/api/instance.js';
import { tokenStorage } from '../../lib/session/tokenStorage.js';
import { AuthContext } from './authContext.js';

/**
 * Holds the signed-in user. The stored token is only trusted after the API
 * confirms it (GET /auth/me); any later 401 clears the session.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState(() => (tokenStorage.getToken() ? 'checking' : 'ready'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!tokenStorage.getToken()) return undefined;
    let active = true;
    getCurrentSession().then(
      (session) => {
        if (!active) return;
        setUser(session.user);
        setStatus('ready');
      },
      (error) => {
        if (!active) return;
        if (error?.status === 401) tokenStorage.clear();
        setUser(null);
        setStatus('ready');
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        tokenStorage.clear();
        setUser(null);
      }),
    [],
  );

  const signIn = useCallback((session) => {
    tokenStorage.setSession(session);
    setUser(session.user);
    setStatus('ready');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // The token is dropped locally either way; the server already rejects it if it expired.
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
