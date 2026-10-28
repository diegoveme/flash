import { FEED_PAGE_SIZE } from '@flash/shared';

export function createListFeed({ posts, postPresenter }) {
  /** Public feed: visible posts only, newest first, 12 per page, cursor based. */
  return async function listFeed({ cursor, viewer }) {
    const page = await posts.listFeed({ cursor, limit: FEED_PAGE_SIZE });
    return {
      items: await postPresenter.presentMany(page.items, viewer),
      nextCursor: page.nextCursor,
    };
  };
}
