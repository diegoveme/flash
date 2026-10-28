import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ viewer, useCases }) => ok(await useCases.getUnreadCount({ viewer })),
});
