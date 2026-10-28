import { useEffect, useState } from 'react';

/**
 * Current time in epoch milliseconds, refreshed on an interval so relative
 * labels ("5m ago") stay correct without reading the clock during render.
 * @param {number} [intervalMs]
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
