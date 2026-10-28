import { createHandler } from '../../createHandler.js';
import { created } from '../../responses.js';

export const handler = createHandler({
  auth: 'none',
  run: async ({ body, useCases }) => created(await useCases.register(body)),
});
