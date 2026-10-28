import { COMMENT_MAX_LENGTH, countCharacters } from '@flash/shared';
import { ValidationError } from '../lib/errors.js';

/**
 * @param {unknown} content
 * @returns {string} trimmed content between 1 and 500 characters
 */
export function validateCommentContent(content) {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) {
    throw new ValidationError('Write something before posting.', {
      content: 'Comment cannot be empty.',
    });
  }
  if (countCharacters(text) > COMMENT_MAX_LENGTH) {
    throw new ValidationError(`Comments allow up to ${COMMENT_MAX_LENGTH} characters.`, {
      content: `Use at most ${COMMENT_MAX_LENGTH} characters.`,
    });
  }
  return text;
}

/**
 * @param {{ id: string, postId: string, author: { id: string, username: string },
 *   content: string, now: Date }} params
 */
export function buildComment({ id, postId, author, content, now }) {
  return {
    id,
    postId,
    authorId: author.id,
    authorUsername: author.username,
    content,
    createdAt: now.toISOString(),
  };
}

/** @param {ReturnType<typeof buildComment>} comment */
export function toPublicComment(comment) {
  return {
    id: comment.id,
    postId: comment.postId,
    author: { id: comment.authorId, username: comment.authorUsername },
    content: comment.content,
    createdAt: comment.createdAt,
  };
}
