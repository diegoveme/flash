import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'optional',
  run: async ({ query, viewer, useCases }) =>
    ok(await useCases.listFeed({ cursor: query.cursor, viewer })),
});
