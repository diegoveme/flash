import { IMAGE_CONTENT_TYPES, IMAGE_MAX_BYTES } from '@flash/shared';
import { formatBytes } from '../../lib/format/bytes.js';

/** Value for the file input `accept` attribute. */
export const ACCEPTED_IMAGE_TYPES = IMAGE_CONTENT_TYPES.join(',');

/**
 * Client-side check for a friendlier UX. The server validates the real file
 * signature and size again, so this is never the only line of defense.
 * @param {{ type: string, size: number } | null | undefined} file
 * @returns {string | null} error message, or null when the file looks valid
 */
export function validateImageFile(file) {
  if (!file) return 'Choose a photo to upload.';
  if (!IMAGE_CONTENT_TYPES.includes(file.type)) {
    return 'Only JPEG and PNG images are allowed.';
  }
  if (file.size <= 0) return 'The selected file is empty.';
  if (file.size > IMAGE_MAX_BYTES) {
    return `The image must be 10 MB or less (this one is ${formatBytes(file.size)}).`;
  }
  return null;
}
