import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const COLLECTIONS = [
  'users',
  'usernames',
  'emails',
  'sessions',
  'posts',
  'comments',
  'reactions',
  'notifications',
];

/**
 * In-memory data store shared by the memory repositories, so multi-entity
 * operations (comment + counter + notification) stay consistent like a
 * DynamoDB transaction. Optionally snapshots to a JSON file for local dev.
 * @param {{ file?: string }} [options]
 */
export function createMemoryDatabase({ file } = {}) {
  let loaded = {};
  if (file && existsSync(file)) {
    try {
      loaded = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      loaded = {};
    }
  }
  const state = Object.fromEntries(COLLECTIONS.map((name) => [name, loaded[name] ?? {}]));

  let timer = null;
  return {
    state,
    persist() {
      if (!file) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(state));
      }, 50);
    },
  };
}

/** Copies on the way in and out, so callers never share mutable state. */
export function clone(value) {
  return value === undefined || value === null ? null : structuredClone(value);
}

export function pushNotification(state, notification) {
  if (!notification) return;
  const list = (state.notifications[notification.recipientId] ??= []);
  list.push(clone(notification));
}
