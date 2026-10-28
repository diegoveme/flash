import { IMAGE_CONTENT_TYPES, IMAGE_MAX_BYTES } from '@flash/shared';
import {
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../../lib/errors.js';

export const IMAGE_FORMATS = Object.freeze({
  jpeg: Object.freeze({ contentType: 'image/jpeg', extension: 'jpg' }),
  png: Object.freeze({ contentType: 'image/png', extension: 'png' }),
});

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Detects the real format from the file signature (magic bytes), never from
 * the name or the declared type.
 * @param {Buffer} buffer
 * @returns {'jpeg' | 'png' | null}
 */
export function detectImageFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'png';
  }
  return null;
}

/** @param {string} contentType */
export function formatFromContentType(contentType) {
  return (
    Object.keys(IMAGE_FORMATS).find((key) => IMAGE_FORMATS[key].contentType === contentType) ?? null
  );
}

/**
 * Validates what the client declares before issuing a presigned upload.
 * @param {{ contentType?: unknown, size?: unknown }} input
 */
export function validateUploadRequest(input) {
  const { contentType, size } = input ?? {};
  if (typeof contentType !== 'string' || !IMAGE_CONTENT_TYPES.includes(contentType)) {
    throw new UnsupportedMediaTypeError('Only JPEG or PNG images are allowed.');
  }
  if (!Number.isInteger(size) || size < 1) {
    throw new ValidationError('Invalid file size.', { size: 'Invalid file size.' });
  }
  if (size > IMAGE_MAX_BYTES) {
    throw new PayloadTooLargeError('Images can be up to 10 MB.');
  }
  return { contentType, size };
}

/**
 * Validates the bytes that actually reached storage.
 * @param {Buffer} buffer
 * @param {string} [declaredContentType]
 * @returns {'jpeg' | 'png'}
 */
export function assertImageFile(buffer, declaredContentType) {
  if (buffer.length > IMAGE_MAX_BYTES) {
    throw new PayloadTooLargeError('Images can be up to 10 MB.');
  }
  const format = detectImageFormat(buffer);
  if (!format) {
    throw new UnsupportedMediaTypeError('The file is not a valid JPEG or PNG image.');
  }
  if (declaredContentType && IMAGE_FORMATS[format].contentType !== declaredContentType) {
    throw new UnsupportedMediaTypeError('The file content does not match its declared type.');
  }
  return format;
}
