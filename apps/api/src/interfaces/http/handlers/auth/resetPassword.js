import { createHandler } from '../../createHandler.js';
import { noContent } from '../../responses.js';

export const handler = createHandler({
  auth: 'none',
  run: async ({ body, useCases }) => {
    await useCases.resetPassword(body);
    return noContent();
  },
});
