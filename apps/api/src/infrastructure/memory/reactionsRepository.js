import { NotFoundError } from '../../lib/errors.js';
import { clone, pushNotification } from './memoryDatabase.js';

const reactionKey = (postId, userId) => `${postId}#${userId}`;

/** @returns {import('../../application/ports.js').ReactionsRepository} */
export function createMemoryReactionsRepository(db) {
  const { state } = db;

  function visiblePost(postId) {
    const post = state.posts[postId];
    if (!post || !post.visible) throw new NotFoundError('This post is not available.');
    return post;
  }

  return {
    async find(postId, userId) {
      return clone(state.reactions[reactionKey(postId, userId)]);
    },

    async findTypesForPosts(postIds, userId) {
      const types = new Map();
      for (const postId of postIds) {
        const reaction = state.reactions[reactionKey(postId, userId)];
        if (reaction) types.set(postId, reaction.type);
      }
      return types;
    },

    async create(reaction, { notification }) {
      const post = visiblePost(reaction.postId);
      const key = reactionKey(reaction.postId, reaction.userId);
      if (state.reactions[key]) return false;

      state.reactions[key] = clone(reaction);
      post.reactionsCount[reaction.type] += 1;
      pushNotification(state, notification);
      db.persist();
      return true;
    },

    async changeType({ postId, userId, from, to, updatedAt }) {
      const post = visiblePost(postId);
      const reaction = state.reactions[reactionKey(postId, userId)];
      if (!reaction || reaction.type !== from) return false;

      reaction.type = to;
      reaction.updatedAt = updatedAt;
      post.reactionsCount[from] -= 1;
      post.reactionsCount[to] += 1;
      db.persist();
      return true;
    },
  };
}
