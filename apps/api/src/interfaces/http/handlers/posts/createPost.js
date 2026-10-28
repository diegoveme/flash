import { createHandler } from '../../createHandler.js';
import { created } from '../../responses.js';

export const handler = createHandler({
  auth: 'required',
  run: async ({ body, viewer, useCases }) =>
    created(
      await useCases.createPost({
        viewer,
        uploadId: body.uploadId,
        description: body.description,
        tags: body.tags,
        exif: body.exif,
      }),
    ),
});
