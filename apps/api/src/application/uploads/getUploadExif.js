import { IMAGE_MAX_BYTES } from '@flash/shared';
import { IMAGE_FORMATS, assertImageFile } from '../../domain/images/formats.js';
import { readImageMetadata } from '../../domain/images/metadata.js';
import { NotFoundError } from '../../lib/errors.js';
import { pathId } from '../../lib/params.js';
import { uploadObjectKey } from './objectKeys.js';

export function createGetUploadExif({ storage }) {
  /**
   * Validates the uploaded bytes and extracts EXIF (without GPS) so the
   * author can review and edit it before publishing. Nothing is published.
   */
  return async function getUploadExif({ viewer, uploadId }) {
    const id = pathId(uploadId);
    const upload = await storage.getObject(uploadObjectKey(viewer.id, id), {
      maxBytes: IMAGE_MAX_BYTES,
    });
    if (!upload) throw new NotFoundError('Upload not found or expired.');

    const format = assertImageFile(upload.body, upload.contentType);
    const { exif, gpsFound } = readImageMetadata(upload.body, format);

    return {
      uploadId: id,
      contentType: IMAGE_FORMATS[format].contentType,
      size: upload.body.length,
      exif,
      gpsRemoved: gpsFound,
    };
  };
}
