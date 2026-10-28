import { getContainer } from '../../bootstrap/container.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { bearerToken, parseRequest } from './request.js';
import { corsHeaders, errorResponse } from './responses.js';

/**
 * @typedef {'none' | 'optional' | 'required'} AuthLevel
 * @typedef {{ headers: Record<string, string>, params: Record<string, string>,
 *   query: Record<string, string>, body: Record<string, unknown>,
 *   viewer: { id: string, username: string, session: object } | null,
 *   useCases: ReturnType<typeof import('../../application/index.js').createUseCases> }} HandlerContext
 */

/**
 * Wraps a route into a Lambda handler: parses the request, validates the
 * session on every request that needs it, runs the use case and maps errors.
 * @param {{ auth: AuthLevel, run: (context: HandlerContext) => Promise<object> }} definition
 */
export function createHandler({ auth, run }) {
  return async function handler(event) {
    let container;
    try {
      container = getContainer();
      const request = parseRequest(event);

      let viewer = null;
      if (auth !== 'none') {
        viewer = await container.useCases.authenticate(bearerToken(request.headers));
        if (!viewer && auth === 'required') throw new UnauthorizedError();
      }

      const response = await run({ ...request, viewer, useCases: container.useCases });
      return withCors(response, container);
    } catch (error) {
      const response = errorResponse(error);
      if (response.statusCode >= 500) {
        logger.error('Unhandled error', { route: event?.routeKey, error });
      }
      return withCors(response, container);
    }
  };
}

function withCors(response, container) {
  const origin = container?.config?.http?.corsOrigin;
  if (!origin) return response;
  return { ...response, headers: { ...corsHeaders(origin), ...response.headers } };
}
