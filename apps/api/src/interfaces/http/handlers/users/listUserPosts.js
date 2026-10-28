import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'optional',
  run: async ({ params, query, viewer, useCases }) =>
    ok(await useCases.listUserPosts({ username: params.username, cursor: query.cursor, viewer })),
});
