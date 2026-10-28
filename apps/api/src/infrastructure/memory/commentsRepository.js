import { NotFoundError } from '../../lib/errors.js';
import { clone, pushNotification } from './memoryDatabase.js';
import { chronologicalKey, paginate } from './paginate.js';

/** @returns {import('../../application/ports.js').CommentsRepository} */
export function createMemoryCommentsRepository(db) {
  const { state } = db;

  return {
    async add(comment, { notification }) {
      const post = state.posts[comment.postId];
      if (!post || !post.visible) throw new NotFoundError('This post is not available.');

      (state.comments[comment.postId] ??= []).push(clone(comment));
      post.commentsCount = (post.commentsCount ?? 0) + 1;
      pushNotification(state, notification);
      db.persist();
    },

    async listByPost(postId, { cursor, limit }) {
      const page = paginate(state.comments[postId] ?? [], {
        cursor,
        limit,
        keyOf: chronologicalKey,
        order: 'asc',
      });
      return { items: page.items.map(clone), nextCursor: page.nextCursor };
    },
  };
}
