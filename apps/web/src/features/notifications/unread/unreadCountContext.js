import { createContext, useContext } from 'react';

/**
 * @typedef {{
 *   unreadCount: number,
 *   refresh: () => Promise<void>,
 *   setUnreadCount: (count: number) => void,
 * }} UnreadCountValue
 */

/** @type {import('react').Context<UnreadCountValue | null>} */
export const UnreadCountContext = createContext(null);

/** @returns {UnreadCountValue} */
export function useUnreadCount() {
  const value = useContext(UnreadCountContext);
  if (!value) throw new Error('useUnreadCount must be used inside <UnreadCountProvider>.');
  return value;
}
