import { createHandler } from '../../createHandler.js';
import { noContent } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ viewer, useCases }) => {
    await useCases.logout({ viewer });
    return noContent();
  },
});
