import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { clone } from './memoryDatabase.js';
import { chronologicalKey, paginate } from './paginate.js';

/** @returns {import('../../application/ports.js').PostsRepository} */
export function createMemoryPostsRepository(db) {
  const { state } = db;
  const visiblePosts = () => Object.values(state.posts).filter((post) => post.visible);

  return {
    async create(post) {
      state.posts[post.id] = clone(post);
      db.persist();
    },

    async findById(id) {
      return clone(state.posts[id]);
    },

    async findManyByIds(ids) {
      return new Map(ids.filter((id) => state.posts[id]).map((id) => [id, clone(state.posts[id])]));
    },

    async listFeed({ cursor, limit }) {
      const page = paginate(visiblePosts(), {
        cursor,
        limit,
        keyOf: chronologicalKey,
        order: 'desc',
      });
      return { items: page.items.map(clone), nextCursor: page.nextCursor };
    },

    async listByAuthor(authorId, { cursor, limit }) {
      const own = visiblePosts().filter((post) => post.authorId === authorId);
      const page = paginate(own, { cursor, limit, keyOf: chronologicalKey, order: 'desc' });
      return { items: page.items.map(clone), nextCursor: page.nextCursor };
    },

    async hide(postId, authorId, hiddenAt) {
      const post = state.posts[postId];
      if (!post || !post.visible) throw new NotFoundError();
      if (post.authorId !== authorId) throw new ForbiddenError();
      post.visible = false;
      post.hiddenAt = hiddenAt;
      db.persist();
    },
  };
}
