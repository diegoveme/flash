import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { ApiError, NETWORK_ERROR, createApiClient, toApiError } from './client.js';

const originalFetch = globalThis.fetch;

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createApiClient', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mock(async () => jsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends the Bearer token and JSON body', async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', getToken: () => 'tok_123' });
    await client.post('/posts/abc/comments', { content: 'Nice light' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/posts/abc/comments');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok_123');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ content: 'Nice light' });
  });

  it('omits the Authorization header for visitors and skips empty query values', async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', getToken: () => null });
    await client.get('/posts', { query: { cursor: null } });
    await client.get('/posts', { query: { cursor: 'abc=' } });

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/posts');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[1][0]).toBe('http://api.test/posts?cursor=abc%3D');
  });

  it('returns null for 204 responses', async () => {
    globalThis.fetch = mock(async () => new Response(null, { status: 204 }));
    const client = createApiClient({ baseUrl: 'http://api.test', getToken: () => 'tok' });
    expect(await client.post('/auth/logout')).toBeNull();
  });

  it('normalizes API errors with code, message and fields', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse(409, {
        error: { code: 'CONFLICT', message: 'Username taken', fields: { username: 'Taken' } },
      }),
    );
    const client = createApiClient({ baseUrl: 'http://api.test', getToken: () => null });

    const error = await client.post('/auth/register', {}).catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Username taken');
    expect(error.fields).toEqual({ username: 'Taken' });
  });

  it('calls onUnauthorized only when a token was sent', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Session expired' } }),
    );
    const onUnauthorized = mock(() => {});
    let token = 'expired';
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: () => token,
      onUnauthorized,
    });

    await client.get('/auth/me').catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    token = null;
    await client.post('/auth/login', { identifier: 'x', password: 'y' }).catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('turns network failures into a NETWORK_ERROR ApiError', async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = createApiClient({ baseUrl: 'http://api.test', getToken: () => null });
    const error = await client.get('/posts').catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(NETWORK_ERROR);
    expect(error.status).toBe(0);
  });
});

describe('toApiError', () => {
  it('falls back to a status based code and message when the body is not JSON', () => {
    const error = toApiError(404, null);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.fields).toEqual({});
  });

  it('uses INTERNAL_ERROR for unknown statuses', () => {
    expect(toApiError(502, undefined).code).toBe('INTERNAL_ERROR');
  });
});
