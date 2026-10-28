import { IMAGE_MAX_BYTES } from '@flash/shared';
import { sanitizeExif } from '../../domain/exif/sanitize.js';
import { IMAGE_FORMATS, assertImageFile } from '../../domain/images/formats.js';
import {
  hasGpsMetadata,
  readImageMetadata,
  stripImageMetadata,
} from '../../domain/images/metadata.js';
import { buildPost, validatePostDetails } from '../../domain/posts.js';
import { ValidationError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { bodyId } from '../../lib/params.js';
import { postObjectKey, uploadObjectKey } from '../uploads/objectKeys.js';

export function createCreatePost({ posts, storage, postPresenter, clock, logger }) {
  /**
   * Publishes an uploaded image. The stored file never keeps EXIF, XMP or
   * GPS; the EXIF shown in the post comes from the whitelist only.
   */
  return async function createPost({ viewer, uploadId, description, tags, exif }) {
    const id = bodyId(uploadId, 'uploadId');
    const details = validatePostDetails({ description, tags });
    const manualExif = exif === undefined ? undefined : sanitizeExif(exif, { strict: true });

    const uploadKey = uploadObjectKey(viewer.id, id);
    const upload = await storage.getObject(uploadKey, { maxBytes: IMAGE_MAX_BYTES });
    if (!upload) {
      throw new ValidationError(
        'The upload was not found or has expired. Upload the photo again.',
        {
          uploadId: 'Upload not found.',
        },
      );
    }

    const format = assertImageFile(upload.body, upload.contentType);
    const metadata = readImageMetadata(upload.body, format);
    const cleanImage = stripImageMetadata(upload.body, format, {
      orientation: metadata.orientation,
    });
    if (hasGpsMetadata(cleanImage, format)) {
      // Defense in depth: never store an image that still carries location.
      throw new Error('GPS metadata survived stripping');
    }

    const postId = newId();
    const { contentType, extension } = IMAGE_FORMATS[format];
    const imageKey = postObjectKey(postId, extension);
    await storage.putObject(imageKey, cleanImage, contentType);

    const post = buildPost({
      id: postId,
      author: viewer,
      imageKey,
      description: details.description,
      tags: details.tags,
      exif: manualExif ?? metadata.exif,
      now: clock.now(),
    });

    try {
      await posts.create(post);
    } catch (error) {
      await storage.deleteObject(imageKey).catch(() => {});
      throw error;
    }

    await storage.deleteObject(uploadKey).catch((error) => {
      logger.warn('Could not delete processed upload', { uploadId: id, error });
    });

    return { post: await postPresenter.presentOne(post, viewer) };
  };
}
