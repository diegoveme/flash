/**
 * Time source injected into use cases so tests can move time forward
 * (session expiry, token expiry, notification retention).
 * @typedef {{ now: () => Date }} Clock
 */

/** @type {Clock} */
export const systemClock = Object.freeze({ now: () => new Date() });

/**
 * Manually controlled clock for tests.
 * @param {string | Date} start
 */
export function createFixedClock(start) {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    advance(ms) {
      current = new Date(current.getTime() + ms);
    },
    set(value) {
      current = new Date(value);
    },
  };
}

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
