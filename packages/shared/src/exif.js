/**
 * EXIF fields Flash stores and displays. This list is a whitelist: anything
 * else, GPS included, is dropped before saving.
 */
export const EXIF_FIELDS = Object.freeze([
  { key: 'cameraMake', label: 'Camera make', maxLength: 64 },
  { key: 'cameraModel', label: 'Camera model', maxLength: 64 },
  { key: 'lens', label: 'Lens', maxLength: 96 },
  { key: 'focalLength', label: 'Focal length', maxLength: 16 },
  { key: 'aperture', label: 'Aperture', maxLength: 16 },
  { key: 'shutterSpeed', label: 'Shutter speed', maxLength: 16 },
  { key: 'iso', label: 'ISO', maxLength: 8 },
  { key: 'exposureBias', label: 'Exposure bias', maxLength: 16 },
  { key: 'meteringMode', label: 'Metering mode', maxLength: 32 },
  { key: 'flash', label: 'Flash', maxLength: 48 },
  { key: 'dateTaken', label: 'Date taken', maxLength: 32 },
]);

export const EXIF_FIELD_KEYS = Object.freeze(EXIF_FIELDS.map((field) => field.key));
