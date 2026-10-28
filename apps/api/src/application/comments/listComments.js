import { COMMENTS_PAGE_SIZE } from '@flash/shared';
import { toPublicComment } from '../../domain/comments.js';
import { isPostPublic } from '../../domain/posts.js';
import { NotFoundError } from '../../lib/errors.js';
import { pathId } from '../../lib/params.js';

export function createListComments({ posts, comments }) {
  /** Chronological (oldest first) comments of a visible post. */
  return async function listComments({ postId, cursor }) {
    const id = pathId(postId);
    const post = await posts.findById(id);
    if (!isPostPublic(post)) throw new NotFoundError('This post is not available.');

    const page = await comments.listByPost(id, { cursor, limit: COMMENTS_PAGE_SIZE });
    return { items: page.items.map(toPublicComment), nextCursor: page.nextCursor };
  };
}
