import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../app/providers/authContext.js';
import { getUnreadCount } from '../../../lib/api/notifications.js';
import { UnreadCountContext } from './unreadCountContext.js';

const POLL_INTERVAL_MS = 60_000;

/** Keeps the unread notifications badge up to date while someone is signed in. */
export function UnreadCountProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { unreadCount } = await getUnreadCount();
      setCount(unreadCount);
    } catch {
      // Keep the last known value; the next poll will try again.
    }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const poll = () =>
      getUnreadCount().then(
        ({ unreadCount }) => {
          if (active) setCount(unreadCount);
        },
        () => {
          // Keep the last known value; the next poll will try again.
        },
      );
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [userId]);

  const value = useMemo(
    () => ({ unreadCount: userId ? count : 0, refresh, setUnreadCount: setCount }),
    [userId, count, refresh],
  );

  return <UnreadCountContext.Provider value={value}>{children}</UnreadCountContext.Provider>;
}
