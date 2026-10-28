import { EXIF_FIELDS } from '@flash/shared';
import { ValidationError } from '../../lib/errors.js';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
// Location written by hand: degree coordinates or explicit GPS labels.
const LOCATION_HINT = /\bgps\b|\d{1,3}\s*°/i;

/**
 * Keeps only whitelisted EXIF fields as trimmed strings. Unknown keys, GPS
 * included, are dropped. Used for both extracted and manually edited EXIF.
 *
 * - `strict: true` (manual edits from the client): invalid values throw.
 * - `strict: false` (extracted from a file): invalid values are skipped or cut.
 *
 * @param {unknown} input
 * @param {{ strict?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function sanitizeExif(input, { strict = true } = {}) {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    if (strict)
      throw new ValidationError('Invalid EXIF data.', { exif: 'EXIF must be an object.' });
    return {};
  }

  const exif = {};
  const fields = {};

  for (const { key, label, maxLength } of EXIF_FIELDS) {
    let value = input[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
    if (typeof value !== 'string') {
      if (strict) fields[`exif.${key}`] = `${label} must be text.`;
      continue;
    }

    value = value.replace(CONTROL_CHARACTERS, '').trim();
    if (!value) continue;

    if (LOCATION_HINT.test(value)) {
      if (strict) fields[`exif.${key}`] = 'Location data is not allowed.';
      continue;
    }

    const characters = [...value];
    if (characters.length > maxLength) {
      if (strict) {
        fields[`exif.${key}`] = `${label} allows up to ${maxLength} characters.`;
        continue;
      }
      value = characters.slice(0, maxLength).join('');
    }

    exif[key] = value;
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Check the EXIF fields.', fields);
  }
  return exif;
}
