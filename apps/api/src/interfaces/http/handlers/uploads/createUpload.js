import { createHandler } from '../../createHandler.js';
import { created } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ body, viewer, useCases }) =>
    created(
      await useCases.createUpload({ viewer, contentType: body.contentType, size: body.size }),
    ),
});
