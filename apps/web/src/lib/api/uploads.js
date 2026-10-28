import { ApiError, NETWORK_ERROR } from './client.js';
import { http } from './instance.js';

/**
 * Asks the API for a presigned POST to upload the image straight to storage.
 * @param {{ contentType: string, size: number }} body
 * @returns {Promise<{ uploadId: string, url: string, fields: Record<string, string>, maxBytes: number, expiresAt: string }>}
 */
export const createUpload = (body) => http.post('/uploads', body);

/**
 * Validates the uploaded file on the server and returns its EXIF (without GPS).
 * @param {string} uploadId
 */
export const getUploadExif = (uploadId) =>
  http.get(`/uploads/${encodeURIComponent(uploadId)}/exif`);

/**
 * Presigned POST body: every policy field first, the file last under "file".
 * S3 ignores fields placed after the file, so the order matters.
 * @param {Record<string, string>} fields
 * @param {Blob} file
 */
export function buildUploadForm(fields, file) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append('file', file);
  return form;
}

/**
 * Maps a storage (S3 or local emulator) failure to an ApiError.
 * S3 answers with XML such as <Code>EntityTooLarge</Code>.
 * @param {number} status
 * @param {string} body
 */
export function toStorageError(status, body = '') {
  const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? '';
  if (status === 413 || code === 'EntityTooLarge') {
    return new ApiError({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The image exceeds 10 MB.',
    });
  }
  if (code === 'AccessDenied' && /expired/i.test(body)) {
    return new ApiError({
      status,
      code: 'UPLOAD_EXPIRED',
      message: 'The upload link expired. Please try again.',
    });
  }
  return new ApiError({
    status,
    code: 'UPLOAD_FAILED',
    message: 'The image could not be uploaded. Please try again.',
  });
}

/**
 * Sends the file to the presigned URL. Uses XHR in the browser to report progress.
 * No Authorization header is sent: storage only trusts the signed policy.
 *
 * @param {{ url: string, fields: Record<string, string>, file: Blob, onProgress?: (ratio: number) => void }} params
 * @returns {Promise<void>}
 */
export function uploadToStorage({ url, fields, file, onProgress }) {
  const form = buildUploadForm(fields, file);

  if (typeof XMLHttpRequest === 'undefined') {
    return globalThis.fetch(url, { method: 'POST', body: form }).then(
      async (response) => {
        if (!response.ok) throw toStorageError(response.status, await response.text());
      },
      () => {
        throw new ApiError({ status: 0, code: NETWORK_ERROR, message: 'Could not reach storage.' });
      },
    );
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(toStorageError(xhr.status, xhr.responseText));
    };
    xhr.onerror = () =>
      reject(new ApiError({ status: 0, code: NETWORK_ERROR, message: 'Could not reach storage.' }));
    xhr.send(form);
  });
}
