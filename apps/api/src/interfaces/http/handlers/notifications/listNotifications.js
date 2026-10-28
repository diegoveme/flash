import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ query, viewer, useCases }) =>
    ok(await useCases.listNotifications({ viewer, cursor: query.cursor })),
});
