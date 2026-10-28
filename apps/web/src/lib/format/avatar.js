/**
 * Up to two uppercase initials from a username: "marcus_chen" -> "MC", "elena" -> "EL".
 * @param {string} username
 */
export function initialsFor(username = '') {
  const parts = username.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

/**
 * Stable index in [0, size) derived from a string, so each user keeps the same color.
 * @param {string} value
 * @param {number} size
 */
export function stableIndex(value = '', size = 1) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash % size;
}
