import { createHandler } from '../../createHandler.js';
import { ok } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ params, viewer, useCases }) =>
    ok(await useCases.getUploadExif({ viewer, uploadId: params.uploadId })),
});
