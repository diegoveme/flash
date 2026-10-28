import { afterEach, describe, expect, it, mock } from 'bun:test';
import { buildUploadForm, toStorageError, uploadToStorage } from './uploads.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('buildUploadForm', () => {
  it('puts every policy field before the file', () => {
    const file = new Blob(['x'], { type: 'image/png' });
    const form = buildUploadForm(
      { key: 'uploads/u1/abc', 'Content-Type': 'image/png', policy: 'p' },
      file,
    );
    const names = [...form.keys()];
    expect(names).toEqual(['key', 'Content-Type', 'policy', 'file']);
  });
});

describe('toStorageError', () => {
  it('maps S3 EntityTooLarge to PAYLOAD_TOO_LARGE', () => {
    const error = toStorageError(400, '<Error><Code>EntityTooLarge</Code></Error>');
    expect(error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(error.status).toBe(413);
  });

  it('maps expired policies', () => {
    const error = toStorageError(
      403,
      '<Error><Code>AccessDenied</Code><Message>Policy expired.</Message></Error>',
    );
    expect(error.code).toBe('UPLOAD_EXPIRED');
  });

  it('falls back to UPLOAD_FAILED', () => {
    expect(toStorageError(500, '').code).toBe('UPLOAD_FAILED');
  });
});

describe('uploadToStorage (fetch fallback)', () => {
  it('posts the form without an Authorization header', async () => {
    const fetchMock = mock(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const file = new Blob(['x'], { type: 'image/jpeg' });

    await uploadToStorage({ url: 'http://storage.test/upload', fields: { key: 'k' }, file });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://storage.test/upload');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('rejects with a storage error on failure', async () => {
    globalThis.fetch = mock(
      async () => new Response('<Error><Code>EntityTooLarge</Code></Error>', { status: 400 }),
    );
    const error = await uploadToStorage({
      url: 'http://storage.test/upload',
      fields: {},
      file: new Blob(['x']),
    }).catch((err) => err);
    expect(error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
