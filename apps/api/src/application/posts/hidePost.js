import { isPostPublic } from '../../domain/posts.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { pathId } from '../../lib/params.js';

export function createHidePost({ posts, clock }) {
  /** Logical delete (`visible = false`). Only the author can do it. */
  return async function hidePost({ postId, viewer }) {
    const id = pathId(postId);
    const post = await posts.findById(id);
    if (!isPostPublic(post)) throw new NotFoundError('This post is not available.');
    if (post.authorId !== viewer.id)
      throw new ForbiddenError('Only the author can hide this post.');

    await posts.hide(id, viewer.id, clock.now().toISOString());
  };
}
