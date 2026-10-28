import { NOTIFICATION_TTL_DAYS } from '@flash/shared';
import { DAY_MS } from '../lib/clock.js';

export const NOTIFICATION_TTL_MS = NOTIFICATION_TTL_DAYS * DAY_MS;
export const COMMENT_SNIPPET_LENGTH = 120;

/**
 * People are never notified about their own actions.
 * @param {{ actorId: string, recipientId: string }} params
 */
export function shouldNotify({ actorId, recipientId }) {
  return actorId !== recipientId;
}

/** @param {string} content */
export function commentSnippet(content) {
  const characters = [...content];
  if (characters.length <= COMMENT_SNIPPET_LENGTH) return content;
  return `${characters.slice(0, COMMENT_SNIPPET_LENGTH).join('').trimEnd()}...`;
}

/**
 * @param {{ id: string, recipientId: string, actor: { id: string, username: string },
 *   postId: string, type: 'comment' | 'reaction', reactionType?: string,
 *   commentContent?: string, now: Date }} params
 */
export function buildNotification({
  id,
  recipientId,
  actor,
  postId,
  type,
  reactionType,
  commentContent,
  now,
}) {
  return {
    id,
    recipientId,
    actorId: actor.id,
    actorUsername: actor.username,
    postId,
    type,
    reactionType: type === 'reaction' ? reactionType : undefined,
    commentSnippet: type === 'comment' ? commentSnippet(commentContent ?? '') : undefined,
    read: false,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + NOTIFICATION_TTL_MS).toISOString(),
  };
}

/** Oldest creation date that is still inside the 7 day window. */
export function retentionWindowStart(now) {
  return new Date(now.getTime() - NOTIFICATION_TTL_MS);
}

/**
 * Expired notifications are filtered at query time because DynamoDB TTL
 * deletion is not exact.
 */
export function isNotificationActive(notification, now) {
  return new Date(notification.expiresAt) > now;
}

/**
 * @param {ReturnType<typeof buildNotification>} notification
 * @param {{ postImageUrl: string | null }} extra
 */
export function toPublicNotification(notification, { postImageUrl }) {
  return {
    id: notification.id,
    type: notification.type,
    actor: { id: notification.actorId, username: notification.actorUsername },
    post: { id: notification.postId, imageUrl: postImageUrl },
    reactionType: notification.reactionType ?? null,
    commentSnippet: notification.commentSnippet ?? null,
    read: notification.read,
    createdAt: notification.createdAt,
    expiresAt: notification.expiresAt,
  };
}
