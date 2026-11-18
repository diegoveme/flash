import { getContainer } from '../../bootstrap/container.js';
import { handlers } from './handlers/index.js';
import { corsHeaders, json } from './responses.js';
import { matchRoute } from './router.js';

/**
 * Single Lambda entry point for a Lambda function URL (payload format 2.0).
 * Used where one function per route is not possible, such as AWS Academy
 * labs. It routes to the same handlers that API Gateway invokes one by one.
 */
export async function handler(event) {
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '/';
  const cors = corsHeaders(getContainer().config.http.corsOrigin);

  if (method === 'OPTIONS') return { statusCode: 204, headers: cors };

  const found = matchRoute(method, path);
  if (!found) {
    const response = json(404, { error: { code: 'NOT_FOUND', message: 'Route not found.' } });
    return { ...response, headers: { ...cors, ...response.headers } };
  }

  return handlers[found.route.handler]({
    ...event,
    routeKey: `${found.route.method} ${found.route.path}`,
    pathParameters: found.params,
  });
}
