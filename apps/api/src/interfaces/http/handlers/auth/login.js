import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'none',
  run: async ({ body, useCases }) => ok(await useCases.login(body)),
});
