import { useEffect, useState } from 'react';
import { getProfile } from '../../../lib/api/users.js';

/**
 * Loads a public profile ({ id, username, createdAt }). Remount to load another user.
 * @param {string} username
 */
export function useProfile(username) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getProfile(username).then(
      (result) => {
        if (!active) return;
        setProfile(result.user);
        setStatus('ready');
      },
      (err) => {
        if (!active) return;
        setError(err);
        setStatus(err?.status === 404 ? 'not-found' : 'error');
      },
    );
    return () => {
      active = false;
    };
  }, [username]);

  return { profile, status, error };
}
