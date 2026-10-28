import { TAGS_MAX_COUNT, TAG_MAX_LENGTH } from './limits.js';

/**
 * Counts user-perceived characters by code point, so emoji and accented
 * letters count once. Both client and server use it for length limits.
 * @param {string} value
 */
export function countCharacters(value) {
  return [...value].length;
}

const TAG_PATTERN = /^[\p{L}\p{N}_-]+$/u;

/**
 * Turns "Street, #Monochrome, street" into ["street", "monochrome"].
 * Invalid entries are reported so the caller can decide how to respond.
 * @param {string | string[]} input
 * @returns {{ tags: string[], invalid: string[] }}
 */
export function normalizeTags(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(',');
  const tags = [];
  const invalid = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') {
      invalid.push(String(entry));
      continue;
    }
    const tag = entry.trim().replace(/^#+/, '').toLowerCase();
    if (!tag) continue;
    if (countCharacters(tag) > TAG_MAX_LENGTH || !TAG_PATTERN.test(tag)) {
      invalid.push(entry);
      continue;
    }
    if (!tags.includes(tag)) tags.push(tag);
  }

  if (tags.length > TAGS_MAX_COUNT) {
    invalid.push(...tags.splice(TAGS_MAX_COUNT));
  }

  return { tags, invalid };
}
