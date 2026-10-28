import { EXIF_FIELDS } from '@flash/shared';

/**
 * Short technical badges shown over a photo: aperture, shutter, focal length, ISO.
 * @param {Record<string, string> | undefined} exif
 * @returns {string[]}
 */
export function exifBadges(exif) {
  if (!exif) return [];
  const badges = [exif.aperture, exif.shutterSpeed, exif.focalLength].filter(Boolean);
  if (exif.iso) badges.push(/^iso/i.test(exif.iso) ? exif.iso : `ISO ${exif.iso}`);
  return badges;
}

/**
 * Builds the EXIF payload for the API from form values: trims, drops empty
 * fields and anything that is not in the shared whitelist.
 * @param {Record<string, string>} values
 */
export function toExifPayload(values) {
  const exif = {};
  for (const { key } of EXIF_FIELDS) {
    const value = typeof values[key] === 'string' ? values[key].trim() : '';
    if (value) exif[key] = value;
  }
  return exif;
}

/**
 * Form values for every whitelisted field, filled from an EXIF object.
 * @param {Record<string, string> | undefined} exif
 */
export function toExifFormValues(exif = {}) {
  return Object.fromEntries(EXIF_FIELDS.map(({ key }) => [key, exif[key] ?? '']));
}
