import { createHandler } from '../../createHandler.js';
import { noContent } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ params, viewer, useCases }) => {
    await useCases.hidePost({ postId: params.postId, viewer });
    return noContent();
  },
});
