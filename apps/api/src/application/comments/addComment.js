import { buildComment, toPublicComment, validateCommentContent } from '../../domain/comments.js';
import { buildNotification, shouldNotify } from '../../domain/notifications.js';
import { isPostPublic } from '../../domain/posts.js';
import { NotFoundError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { pathId } from '../../lib/params.js';

export function createAddComment({ posts, comments, clock }) {
  /**
   * Adds a comment (1 to 500 characters). The post author is notified unless
   * they are commenting on their own post.
   */
  return async function addComment({ viewer, postId, content }) {
    const id = pathId(postId);
    const text = validateCommentContent(content);

    const post = await posts.findById(id);
    if (!isPostPublic(post)) throw new NotFoundError('This post is not available.');

    const now = clock.now();
    const comment = buildComment({ id: newId(), postId: id, author: viewer, content: text, now });
    const notification = shouldNotify({ actorId: viewer.id, recipientId: post.authorId })
      ? buildNotification({
          id: newId(),
          recipientId: post.authorId,
          actor: viewer,
          postId: id,
          type: 'comment',
          commentContent: text,
          now,
        })
      : null;

    await comments.add(comment, { notification });
    return { comment: toPublicComment(comment) };
  };
}
