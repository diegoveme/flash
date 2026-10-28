import { REACTION_TYPES, isReactionType } from '@flash/shared';
import { ValidationError } from '../lib/errors.js';

/**
 * @param {unknown} type
 * @returns {'like' | 'inspire' | 'wow'}
 */
export function assertReactionType(type) {
  if (!isReactionType(type)) {
    throw new ValidationError('Unknown reaction.', {
      type: `Use one of: ${REACTION_TYPES.join(', ')}.`,
    });
  }
  return type;
}

/**
 * @param {{ postId: string, userId: string, type: string, now: Date }} params
 */
export function buildReaction({ postId, userId, type, now }) {
  const timestamp = now.toISOString();
  return { postId, userId, type, createdAt: timestamp, updatedAt: timestamp };
}

/** @param {ReturnType<typeof buildReaction>} reaction */
export function toPublicReaction(reaction) {
  return { type: reaction.type, createdAt: reaction.createdAt, updatedAt: reaction.updatedAt };
}
