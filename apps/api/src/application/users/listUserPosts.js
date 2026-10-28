import { FEED_PAGE_SIZE } from '@flash/shared';
import { normalizeUsername } from '../../domain/users.js';
import { NotFoundError } from '../../lib/errors.js';

export function createListUserPosts({ users, posts, postPresenter }) {
  /** Public profile: the feed filtered by author. */
  return async function listUserPosts({ username, cursor, viewer }) {
    const user = await users.findByUsername(normalizeUsername(username));
    if (!user) throw new NotFoundError('This photographer does not exist.');

    const page = await posts.listByAuthor(user.id, { cursor, limit: FEED_PAGE_SIZE });
    return {
      items: await postPresenter.presentMany(page.items, viewer),
      nextCursor: page.nextCursor,
    };
  };
}
