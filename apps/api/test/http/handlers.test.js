import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { setContainer } from '../../src/bootstrap/container.js';
import { routes } from '../../src/interfaces/http/routes.js';
import { createTestContainer } from '../helpers/testContainer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const handlersDir = path.resolve(here, '../../src/interfaces/http/handlers');
const apiDoc = readFileSync(path.resolve(here, '../../../../docs/api.md'), 'utf8');

const handlers = Object.fromEntries(
  await Promise.all(
    routes.map(async (route) => [
      route.handler,
      (await import(`../../src/interfaces/http/handlers/${route.handler}.js`)).handler,
    ]),
  ),
);

function event(route, { body, token, params, query } = {}) {
  return {
    routeKey: route,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    pathParameters: params,
    queryStringParameters: query,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

const call = (handler, options) => handlers[handler](event(handler, options));
const parse = (response) => (response.body ? JSON.parse(response.body) : undefined);

describe('route table', () => {
  it('has a handler file exporting `handler` for every route', () => {
    for (const route of routes) {
      assert.ok(existsSync(path.join(handlersDir, `${route.handler}.js`)), route.handler);
      assert.equal(typeof handlers[route.handler], 'function', route.handler);
    }
  });

  it('matches docs/api.md', () => {
    for (const route of routes) {
      assert.ok(apiDoc.includes(`\`${route.path}\``), `${route.path} documented`);
      assert.ok(apiDoc.includes(`\`${route.handler}\``), `${route.handler} documented`);
    }
  });
});

describe('HTTP handlers', () => {
  let c;
  before(async () => {
    c = await createTestContainer();
    setContainer(c);
  });
  after(() => c.cleanup());

  const account = {
    email: 'Lens@Example.com',
    username: 'lens',
    birthDate: '1990-05-05',
    password: 'long enough pw',
  };

  it('registers, returns the session and never leaks private data', async () => {
    const response = await call('auth/register', { body: account });
    assert.equal(response.statusCode, 201);
    assert.equal(response.headers['access-control-allow-origin'], c.config.http.corsOrigin);
    const text = response.body.toLowerCase();
    assert.ok(!text.includes(account.email.toLowerCase()));
    assert.ok(!text.includes(account.birthDate));
  });

  it('protects write routes and reports errors in the standard format', async () => {
    const response = await call('posts/createPost', { body: {} });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(parse(response), {
      error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' },
    });
  });

  it('returns field errors as 400', async () => {
    const response = await call('auth/register', { body: { email: 'x' } });
    assert.equal(response.statusCode, 400);
    assert.equal(parse(response).error.code, 'VALIDATION_ERROR');
    assert.ok(parse(response).error.fields.email);
  });

  it('rejects invalid JSON bodies', async () => {
    const response = await handlers['auth/login']({ headers: {}, body: '{oops' });
    assert.equal(response.statusCode, 400);
  });

  it('rejects the token on the server immediately after logout', async () => {
    const login = parse(
      await call('auth/login', { body: { identifier: 'lens', password: account.password } }),
    );
    assert.equal((await call('auth/me', { token: login.token })).statusCode, 200);

    assert.equal((await call('auth/logout', { token: login.token })).statusCode, 204);
    assert.equal((await call('auth/me', { token: login.token })).statusCode, 401);
    assert.equal(
      (await call('notifications/getUnreadCount', { token: login.token })).statusCode,
      401,
    );
  });

  it('lets visitors read but treats a bad token on public routes as a visitor', async () => {
    const response = await call('posts/listFeed', { token: 'invalid-token-value' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { items: [], nextCursor: null });
  });

  it('answers password recovery with 202 and the same body for unknown emails', async () => {
    const known = await call('auth/requestPasswordRecovery', { body: { email: account.email } });
    const unknown = await call('auth/requestPasswordRecovery', {
      body: { email: 'ghost@example.com' },
    });
    assert.equal(known.statusCode, 202);
    assert.equal(known.body, unknown.body);
  });

  it('returns 404 for unknown profiles and does not expose email on known ones', async () => {
    assert.equal(
      (await call('users/getProfile', { params: { username: 'nobody' } })).statusCode,
      404,
    );
    const profile = await call('users/getProfile', { params: { username: 'LENS' } });
    assert.equal(profile.statusCode, 200);
    assert.deepEqual(Object.keys(parse(profile).user).sort(), ['createdAt', 'id', 'username']);
  });
});
