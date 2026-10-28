import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'optional',
  run: async ({ params, viewer, useCases }) =>
    ok(await useCases.getPost({ postId: params.postId, viewer })),
});
