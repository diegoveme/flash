import { createHandler } from '../../createHandler.js';
import { created } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ params, body, viewer, useCases }) =>
    created(await useCases.addComment({ viewer, postId: params.postId, content: body.content })),
});
