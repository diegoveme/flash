import { createContext, useContext } from 'react';

/**
 * @typedef {{ id: string, username: string, createdAt: string }} PublicUser
 * @typedef {{
 *   status: 'checking' | 'ready',
 *   user: PublicUser | null,
 *   signIn: (session: { token: string, expiresAt: string, user: PublicUser }) => void,
 *   signOut: () => Promise<void>,
 * }} AuthValue
 */

/** @type {import('react').Context<AuthValue | null>} */
export const AuthContext = createContext(null);

/** @returns {AuthValue} */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
