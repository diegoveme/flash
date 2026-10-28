import { randomUUID } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { IMAGE_MAX_BYTES } from '@flash/shared';
import { getContainer } from '../bootstrap/container.js';
import { routes } from '../interfaces/http/routes.js';
import { corsHeaders } from '../interfaces/http/responses.js';
import { logger } from '../lib/logger.js';

/*
 * Local development server. It runs the same Lambda handlers as AWS by
 * turning each HTTP request into an API Gateway (HTTP API v2) event, and it
 * emulates the S3 presigned POST target and the CloudFront image origin.
 */

// With the memory driver, keep data between restarts in a git-ignored file.
if ((process.env.DB_DRIVER ?? 'memory') === 'memory') {
  process.env.MEMORY_DB_FILE ??= path.resolve('.local', 'memory-db.json');
}

const MAX_JSON_REQUEST_BYTES = 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const container = getContainer();
const { config, storage } = container;
const cors = corsHeaders(config.http.corsOrigin);

const compiledRoutes = routes.map((route) => {
  const names = [];
  const pattern = route.path.replace(/\{(\w+)\}/g, (_, name) => {
    names.push(name);
    return '([^/]+)';
  });
  return { ...route, regex: new RegExp(`^${pattern}$`), names };
});

const handlerCache = new Map();
function loadHandler(name) {
  if (!handlerCache.has(name)) {
    const url = new URL(`../interfaces/http/handlers/${name}.js`, import.meta.url);
    handlerCache.set(
      name,
      import(url.href).then((module) => module.handler),
    );
  }
  return handlerCache.get(name);
}

function matchRoute(method, pathname) {
  for (const route of compiledRoutes) {
    if (route.method !== method) continue;
    const match = route.regex.exec(pathname);
    if (match) {
      const params = Object.fromEntries(
        route.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
      );
      return { route, params };
    }
  }
  return null;
}

async function readBody(request, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(response, { statusCode, headers = {}, body }) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

function sendJsonError(response, statusCode, code, message) {
  send(response, {
    statusCode,
    headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ error: { code, message } }),
  });
}

function toApiGatewayEvent(request, url, route, params, body) {
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(',') : value,
    ]),
  );
  const query = Object.fromEntries(url.searchParams);
  return {
    version: '2.0',
    routeKey: `${route.method} ${route.path}`,
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers,
    queryStringParameters: Object.keys(query).length > 0 ? query : undefined,
    pathParameters: Object.keys(params).length > 0 ? params : undefined,
    requestContext: {
      requestId: randomUUID(),
      http: { method: request.method, path: url.pathname, sourceIp: request.socket.remoteAddress },
    },
    body: body || undefined,
    isBase64Encoded: false,
  };
}

async function handleLocalUpload(request, response, url) {
  const length = Number(request.headers['content-length']);
  if (!Number.isFinite(length)) return send(response, { statusCode: 411, headers: cors });
  if (length > IMAGE_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return send(response, {
      statusCode: 400,
      headers: { ...cors, 'content-type': 'application/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Error><Code>EntityTooLarge</Code><Message>The file exceeds the maximum size.</Message></Error>',
    });
  }

  const webRequest = new Request(url, {
    method: 'POST',
    headers: { 'content-type': request.headers['content-type'] ?? '' },
    body: Readable.toWeb(request),
    duplex: 'half',
  });
  const form = await webRequest.formData();
  const result = await storage.receiveUpload(form);
  if (!result.code) return send(response, { statusCode: result.status, headers: cors });
  send(response, {
    statusCode: result.status,
    headers: { ...cors, 'content-type': 'application/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${result.code}</Code><Message>${result.message}</Message></Error>`,
  });
}

async function serveLocalObject(response, url) {
  const key = decodeURIComponent(url.pathname.slice('/local-storage/objects/'.length));
  const object = await storage.readPublicObject(key);
  if (!object) return send(response, { statusCode: 404, headers: cors });
  send(response, {
    statusCode: 200,
    headers: { 'content-type': object.contentType, 'cache-control': 'public, max-age=3600' },
    body: object.body,
  });
}

const server = http.createServer(async (request, response) => {
  const startedAt = Date.now();
  const url = new URL(request.url ?? '/', config.http.apiBaseUrl);

  try {
    if (request.method === 'OPTIONS') return send(response, { statusCode: 204, headers: cors });

    const emulatesStorage = typeof storage.receiveUpload === 'function';
    if (emulatesStorage && request.method === 'POST' && url.pathname === '/local-storage/upload') {
      return await handleLocalUpload(request, response, url);
    }
    if (
      emulatesStorage &&
      request.method === 'GET' &&
      url.pathname.startsWith('/local-storage/objects/')
    ) {
      return await serveLocalObject(response, url);
    }

    const found = matchRoute(request.method, url.pathname);
    if (!found) return sendJsonError(response, 404, 'NOT_FOUND', 'Route not found.');

    const body = await readBody(request, MAX_JSON_REQUEST_BYTES);
    if (body === null)
      return sendJsonError(response, 413, 'PAYLOAD_TOO_LARGE', 'Request body too large.');

    const handler = await loadHandler(found.route.handler);
    const result = await handler(toApiGatewayEvent(request, url, found.route, found.params, body));
    send(response, result);
  } catch (error) {
    logger.error('Local server error', { path: url.pathname, error });
    if (!response.headersSent)
      sendJsonError(response, 500, 'INTERNAL_ERROR', 'Something went wrong.');
  } finally {
    logger.info('request', {
      method: request.method,
      path: url.pathname,
      status: response.statusCode,
      ms: Date.now() - startedAt,
    });
  }
});

server.listen(config.http.port, () => {
  const { db, cache, storage: storageDriver, mail } = config.drivers;
  console.log(
    `Flash API listening on ${config.http.apiBaseUrl} (db: ${db}, cache: ${cache}, storage: ${storageDriver}, mail: ${mail})`,
  );
});
