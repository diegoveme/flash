import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { PayloadTooLargeError } from '../../lib/errors.js';

// Without s3:ListBucket, S3 answers 403 instead of 404 for missing keys.
const isMissing = (error) =>
  ['NoSuchKey', 'NotFound', 'AccessDenied'].includes(error?.name) ||
  [403, 404].includes(error?.$metadata?.httpStatusCode);

/**
 * Private S3 bucket. Uploads arrive through presigned POST policies; images
 * are read by the public only through CloudFront (`imagesBaseUrl`).
 * @param {{ region: string, bucket: string, imagesBaseUrl: string }} options
 * @returns {import('../../application/ports.js').ObjectStorage}
 */
export function createS3ObjectStorage({ region, bucket, imagesBaseUrl }) {
  const client = new S3Client({ region });

  return {
    async createUploadTarget({ key, contentType, maxBytes, expiresInSeconds }) {
      const { url, fields } = await createPresignedPost(client, {
        Bucket: bucket,
        Key: key,
        Conditions: [
          ['content-length-range', 1, maxBytes],
          ['eq', '$Content-Type', contentType],
        ],
        Fields: { 'Content-Type': contentType },
        Expires: expiresInSeconds,
      });
      return { url, fields };
    },

    async getObject(key, { maxBytes }) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        if ((head.ContentLength ?? 0) > maxBytes) {
          throw new PayloadTooLargeError('Images can be up to 10 MB.');
        }
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const body = Buffer.from(await result.Body.transformToByteArray());
        return { body, contentType: result.ContentType };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },

    async putObject(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Short cache so hidden posts stop being served by CloudFront soon.
          CacheControl: 'public, max-age=3600',
        }),
      );
    },

    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    publicUrl(key) {
      return `${imagesBaseUrl}/${key}`;
    },
  };
}
