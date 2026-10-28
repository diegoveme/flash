import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'none',
  run: async ({ params, query, useCases }) =>
    ok(await useCases.listComments({ postId: params.postId, cursor: query.cursor })),
});
