import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ params, body, viewer, useCases }) =>
    ok(await useCases.setReaction({ viewer, postId: params.postId, type: body.type })),
});
