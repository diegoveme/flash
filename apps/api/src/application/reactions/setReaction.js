import { buildNotification, shouldNotify } from '../../domain/notifications.js';
import { isPostPublic } from '../../domain/posts.js';
import { assertReactionType, buildReaction, toPublicReaction } from '../../domain/reactions.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { pathId } from '../../lib/params.js';

const MAX_ATTEMPTS = 3;

export function createSetReaction({ posts, reactions, clock }) {
  /**
   * Sets the viewer's single reaction on a post.
   * - First reaction: stored with a uniqueness condition; notifies the author
   *   when the actor is someone else.
   * - Different type: the type changes, never a new notification.
   * - Same type: no-op.
   * Concurrent requests are resolved by retrying against the stored state.
   */
  return async function setReaction({ viewer, postId, type }) {
    const id = pathId(postId);
    const reactionType = assertReactionType(type);

    const post = await posts.findById(id);
    if (!isPostPublic(post)) throw new NotFoundError('This post is not available.');

    const respond = async (reaction) => {
      const fresh = await posts.findById(id);
      return { reaction: toPublicReaction(reaction), reactionsCount: fresh.reactionsCount };
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const now = clock.now();
      const existing = await reactions.find(id, viewer.id);

      if (!existing) {
        const reaction = buildReaction({ postId: id, userId: viewer.id, type: reactionType, now });
        const notification = shouldNotify({ actorId: viewer.id, recipientId: post.authorId })
          ? buildNotification({
              id: newId(),
              recipientId: post.authorId,
              actor: viewer,
              postId: id,
              type: 'reaction',
              reactionType,
              now,
            })
          : null;

        if (await reactions.create(reaction, { notification })) return respond(reaction);
        continue;
      }

      if (existing.type === reactionType) return respond(existing);

      const updatedAt = now.toISOString();
      const changed = await reactions.changeType({
        postId: id,
        userId: viewer.id,
        from: existing.type,
        to: reactionType,
        updatedAt,
      });
      if (changed) return respond({ ...existing, type: reactionType, updatedAt });
    }

    throw new ConflictError('The reaction changed at the same time. Try again.');
  };
}
