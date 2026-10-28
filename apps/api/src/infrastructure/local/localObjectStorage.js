import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PayloadTooLargeError } from '../../lib/errors.js';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const KEY_PATTERN = new RegExp(`^(uploads/${UUID}/${UUID}|posts/${UUID}\\.(jpg|png))$`);
const PUBLIC_KEY_PATTERN = new RegExp(`^posts/${UUID}\\.(jpg|png)$`);

const isMissing = (error) => error?.code === 'ENOENT';

/**
 * Local stand-in for S3 + CloudFront, used in development:
 * - files live under `rootDir`;
 * - upload targets are HMAC-signed policies, like S3 presigned POST, checked
 *   by `receiveUpload` (content type, size limit, expiry, exact key);
 * - only `posts/` objects are publicly readable, like the CloudFront origin.
 *
 * @param {{ rootDir: string, apiBaseUrl: string, imagesBaseUrl: string,
 *   signingSecret?: string, clock: import('../../lib/clock.js').Clock }} options
 */
export function createLocalObjectStorage({
  rootDir,
  apiBaseUrl,
  imagesBaseUrl,
  signingSecret,
  clock,
}) {
  const secret = signingSecret ?? randomBytes(32).toString('hex');

  const filePath = (key) => {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid object key');
    return path.join(rootDir, ...key.split('/'));
  };
  const metaPath = (key) => `${filePath(key)}.meta.json`;
  const sign = (policy) => createHmac('sha256', secret).update(policy).digest();

  async function write(key, body, contentType) {
    await mkdir(path.dirname(filePath(key)), { recursive: true });
    await writeFile(filePath(key), body);
    await writeFile(metaPath(key), JSON.stringify({ contentType }));
  }

  async function read(key) {
    try {
      const [body, meta] = await Promise.all([
        readFile(filePath(key)),
        readFile(metaPath(key), 'utf8'),
      ]);
      return { body, contentType: JSON.parse(meta).contentType };
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  return {
    async createUploadTarget({ key, contentType, maxBytes, expiresInSeconds }) {
      const policy = Buffer.from(
        JSON.stringify({
          key,
          contentType,
          maxBytes,
          expiresAt: clock.now().getTime() + expiresInSeconds * 1000,
        }),
      ).toString('base64url');
      return {
        url: `${apiBaseUrl}/local-storage/upload`,
        fields: {
          key,
          'Content-Type': contentType,
          policy,
          signature: sign(policy).toString('base64url'),
        },
      };
    },

    async getObject(key, { maxBytes }) {
      try {
        const info = await stat(filePath(key));
        if (info.size > maxBytes) throw new PayloadTooLargeError('Images can be up to 10 MB.');
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
      return read(key);
    },

    putObject: write,

    async deleteObject(key) {
      await rm(filePath(key), { force: true });
      await rm(metaPath(key), { force: true });
    },

    publicUrl(key) {
      return `${imagesBaseUrl}/${key}`;
    },

    /**
     * Local only: emulates the S3 presigned POST endpoint, including S3's
     * error codes (AccessDenied, EntityTooLarge...).
     * @param {FormData} form
     * @returns {Promise<{ status: number, code?: string, message?: string }>}
     */
    async receiveUpload(form) {
      const denied = (message) => ({ status: 403, code: 'AccessDenied', message });
      const policy = form.get('policy');
      const signature = form.get('signature');
      if (typeof policy !== 'string' || typeof signature !== 'string')
        return denied('Missing policy.');

      const expected = sign(policy);
      const given = Buffer.from(signature, 'base64url');
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return denied('Invalid signature.');
      }

      const terms = JSON.parse(Buffer.from(policy, 'base64url').toString('utf8'));
      if (terms.expiresAt < clock.now().getTime()) return denied('Policy expired.');
      if (form.get('key') !== terms.key || form.get('Content-Type') !== terms.contentType) {
        return denied('Policy conditions not met.');
      }

      const file = form.get('file');
      if (!(file instanceof Blob))
        return { status: 400, code: 'InvalidArgument', message: 'Missing file.' };
      if (file.size < 1)
        return { status: 400, code: 'EntityTooSmall', message: 'The file is empty.' };
      if (file.size > terms.maxBytes) {
        return {
          status: 400,
          code: 'EntityTooLarge',
          message: 'The file exceeds the maximum size.',
        };
      }

      await write(terms.key, Buffer.from(await file.arrayBuffer()), terms.contentType);
      return { status: 204 };
    },

    /** Local only: emulates CloudFront, which serves `posts/` and nothing else. */
    async readPublicObject(key) {
      if (!PUBLIC_KEY_PATTERN.test(key)) return null;
      return read(key);
    },
  };
}
