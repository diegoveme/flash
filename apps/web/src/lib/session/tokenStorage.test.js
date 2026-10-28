import { describe, expect, it } from 'bun:test';
import { createTokenStorage } from './tokenStorage.js';

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const NOW = Date.parse('2026-10-27T12:00:00.000Z');

describe('createTokenStorage', () => {
  it('stores and reads a session', () => {
    const storage = memoryStorage();
    const tokens = createTokenStorage(storage, () => NOW);
    tokens.setSession({ token: 'abc', expiresAt: '2026-10-28T12:00:00.000Z', user: { id: 'u1' } });

    expect(tokens.getToken()).toBe('abc');
    // Only the token and its expiry are persisted, not the user.
    expect(JSON.parse(storage.data.get('flash.session'))).toEqual({
      token: 'abc',
      expiresAt: '2026-10-28T12:00:00.000Z',
    });
  });

  it('drops an expired session', () => {
    const storage = memoryStorage();
    const tokens = createTokenStorage(storage, () => NOW);
    tokens.setSession({ token: 'old', expiresAt: '2026-10-27T11:59:59.000Z' });

    expect(tokens.getToken()).toBeNull();
    expect(storage.data.has('flash.session')).toBe(false);
  });

  it('clears the session', () => {
    const tokens = createTokenStorage(memoryStorage(), () => NOW);
    tokens.setSession({ token: 'abc', expiresAt: '2026-10-28T12:00:00.000Z' });
    tokens.clear();
    expect(tokens.getSession()).toBeNull();
  });

  it('ignores corrupted values', () => {
    const storage = memoryStorage();
    storage.setItem('flash.session', '{not json');
    expect(createTokenStorage(storage, () => NOW).getToken()).toBeNull();
  });

  it('keeps working in memory when storage is unavailable', () => {
    const tokens = createTokenStorage(null, () => NOW);
    tokens.setSession({ token: 'abc', expiresAt: '2026-10-28T12:00:00.000Z' });
    expect(tokens.getToken()).toBe('abc');
  });

  it('survives a storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const tokens = createTokenStorage(throwing, () => NOW);
    expect(() =>
      tokens.setSession({ token: 'a', expiresAt: '2026-10-28T12:00:00.000Z' }),
    ).not.toThrow();
    expect(tokens.getToken()).toBeNull();
    expect(() => tokens.clear()).not.toThrow();
  });
});
