import { useEffect } from 'react';

/**
 * Calls `onEscape` when the Escape key is pressed while `enabled` is true.
 * @param {() => void} onEscape
 * @param {boolean} [enabled]
 */
export function useEscapeKey(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}
