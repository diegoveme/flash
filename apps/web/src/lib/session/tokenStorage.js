const STORAGE_KEY = 'flash.session';

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Access can throw in private windows or when site data is blocked.
    return null;
  }
}

/**
 * Persists the session ({ token, expiresAt }) so a reload keeps the user signed in.
 * The server still validates the token on every request; this is only a cache.
 *
 * @param {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null} [storage]
 * @param {() => number} [now]
 */
export function createTokenStorage(storage = browserStorage(), now = () => Date.now()) {
  let memory = null;

  function read() {
    if (!storage) return memory;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clear() {
    memory = null;
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else to do: the in-memory copy is already gone.
    }
  }

  /** @returns {{ token: string, expiresAt: string } | null} */
  function getSession() {
    const session = read();
    if (!session || typeof session.token !== 'string') return null;
    const expiresAt = Date.parse(session.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= now()) {
      clear();
      return null;
    }
    return session;
  }

  /** @param {{ token: string, expiresAt: string }} session */
  function setSession({ token, expiresAt }) {
    const value = { token, expiresAt };
    memory = value;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Storage full or blocked: keep the in-memory copy for this tab.
    }
  }

  return {
    getSession,
    setSession,
    clear,
    getToken: () => getSession()?.token ?? null,
  };
}

export const tokenStorage = createTokenStorage();
