import { IMAGE_MAX_BYTES } from '@flash/shared';
import { validateUploadRequest } from '../../domain/images/formats.js';
import { newId } from '../../lib/ids.js';
import { uploadObjectKey } from './objectKeys.js';

export const UPLOAD_EXPIRES_IN_SECONDS = 10 * 60;

export function createCreateUpload({ storage, clock }) {
  /**
   * Issues a presigned POST so the browser uploads straight to storage.
   * The policy itself enforces the content type and the 10 MB limit.
   */
  return async function createUpload({ viewer, contentType, size }) {
    const request = validateUploadRequest({ contentType, size });
    const uploadId = newId();

    const target = await storage.createUploadTarget({
      key: uploadObjectKey(viewer.id, uploadId),
      contentType: request.contentType,
      maxBytes: IMAGE_MAX_BYTES,
      expiresInSeconds: UPLOAD_EXPIRES_IN_SECONDS,
    });

    return {
      uploadId,
      url: target.url,
      fields: target.fields,
      maxBytes: IMAGE_MAX_BYTES,
      expiresAt: new Date(clock.now().getTime() + UPLOAD_EXPIRES_IN_SECONDS * 1000).toISOString(),
    };
  };
}
