import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { setContainer } from '../../src/bootstrap/container.js';
import { handlers } from '../../src/interfaces/http/handlers/index.js';
import { handler } from '../../src/interfaces/http/lambdaRouter.js';
import { matchRoute } from '../../src/interfaces/http/router.js';
import { routes } from '../../src/interfaces/http/routes.js';
import { createTestContainer, publish, signUp } from '../helpers/testContainer.js';

// Lambda function URL event (payload format 2.0).
function urlEvent(method, rawPath, { body, token } = {}) {
  return {
    rawPath,
    requestContext: { http: { method } },
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

describe('matchRoute', () => {
  it('resolves every route in the table', () => {
    for (const route of routes) {
      const path = route.path.replace(/\{(\w+)\}/g, 'value');
      assert.equal(matchRoute(route.method, path)?.route.handler, route.handler, route.path);
    }
  });

  it('extracts and decodes path parameters', () => {
    const found = matchRoute('GET', '/users/ana%2Ephoto/posts');
    assert.equal(found.route.handler, 'users/listUserPosts');
    assert.deepEqual(found.params, { username: 'ana.photo' });
  });

  it('does not confuse static and parameterized segments', () => {
    assert.equal(
      matchRoute('GET', '/notifications/unread-count').route.handler,
      'notifications/getUnreadCount',
    );
    assert.equal(matchRoute('GET', '/posts/123/comments/extra'), null);
    assert.equal(matchRoute('PATCH', '/posts'), null);
  });

  it('has a handler for every route', () => {
    assert.deepEqual(Object.keys(handlers).sort(), routes.map((route) => route.handler).sort());
  });
});

describe('lambdaRouter (single function URL)', () => {
  let c;
  before(async () => {
    c = await createTestContainer();
    setContainer(c);
  });
  after(() => c.cleanup());

  it('answers CORS preflight requests', async () => {
    const response = await handler(urlEvent('OPTIONS', '/posts'));
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-origin'], c.config.http.corsOrigin);
  });

  it('returns 404 with CORS headers for unknown routes', async () => {
    const response = await handler(urlEvent('GET', '/nope'));
    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error.code, 'NOT_FOUND');
    assert.equal(response.headers['access-control-allow-origin'], c.config.http.corsOrigin);
  });

  it('routes to the handlers with path parameters and auth', async () => {
    const { session, viewer } = await signUp(c);
    const post = await publish(c, viewer);

    const detail = await handler(urlEvent('GET', `/posts/${post.id}`, { token: session.token }));
    assert.equal(detail.statusCode, 200);
    assert.equal(JSON.parse(detail.body).post.id, post.id);

    const comment = await handler(
      urlEvent('POST', `/posts/${post.id}/comments`, {
        token: session.token,
        body: { content: 'From the function URL' },
      }),
    );
    assert.equal(comment.statusCode, 201);

    const visitorWrite = await handler(
      urlEvent('POST', `/posts/${post.id}/comments`, { body: { content: 'hi' } }),
    );
    assert.equal(visitorWrite.statusCode, 401);
  });
});
