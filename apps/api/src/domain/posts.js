import {
  DESCRIPTION_MAX_LENGTH,
  countCharacters,
  emptyReactionCounts,
  normalizeTags,
} from '@flash/shared';
import { ValidationError } from '../lib/errors.js';

/**
 * Validates the optional text parts of a post.
 * @param {{ description?: unknown, tags?: unknown }} input
 * @returns {{ description: string | null, tags: string[] }}
 */
export function validatePostDetails(input) {
  const fields = {};

  let description = null;
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      fields.description = 'Description must be text.';
    } else {
      description = input.description.trim() || null;
      if (description && countCharacters(description) > DESCRIPTION_MAX_LENGTH) {
        fields.description = `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`;
      }
    }
  }

  let tags = [];
  if (input.tags !== undefined && input.tags !== null) {
    if (typeof input.tags !== 'string' && !Array.isArray(input.tags)) {
      fields.tags = 'Tags must be a list or comma separated text.';
    } else {
      const result = normalizeTags(input.tags);
      tags = result.tags;
      if (result.invalid.length > 0) {
        fields.tags = 'Use up to 10 tags with letters, numbers, "-" or "_" (30 characters max).';
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Check the highlighted fields.', fields);
  }
  return { description, tags };
}

/**
 * @param {{ id: string, author: { id: string, username: string }, imageKey: string,
 *   description: string | null, tags: string[], exif: object, now: Date }} params
 */
export function buildPost({ id, author, imageKey, description, tags, exif, now }) {
  return {
    id,
    authorId: author.id,
    authorUsername: author.username,
    imageKey,
    description,
    tags,
    exif,
    createdAt: now.toISOString(),
    visible: true,
    reactionsCount: emptyReactionCounts(),
    commentsCount: 0,
  };
}

/** Hidden posts behave as if they did not exist for every public read. */
export function isPostPublic(post) {
  return Boolean(post) && post.visible === true;
}

/**
 * Public representation. Never includes `visible` or storage keys.
 * @param {ReturnType<typeof buildPost>} post
 * @param {{ imageUrl: string, viewerReaction: string | null }} extra
 */
export function toPublicPost(post, { imageUrl, viewerReaction }) {
  return {
    id: post.id,
    author: { id: post.authorId, username: post.authorUsername },
    imageUrl,
    description: post.description ?? null,
    tags: post.tags ?? [],
    exif: post.exif ?? {},
    createdAt: post.createdAt,
    reactionsCount: { ...emptyReactionCounts(), ...post.reactionsCount },
    commentsCount: post.commentsCount ?? 0,
    viewerReaction: viewerReaction ?? null,
  };
}
