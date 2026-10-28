import { createHandler } from '../../createHandler.js';
import { accepted } from '../../responses.js';

export const handler = createHandler({
  auth: 'none',
  run: async ({ body, useCases }) => accepted(await useCases.requestPasswordRecovery(body)),
});
