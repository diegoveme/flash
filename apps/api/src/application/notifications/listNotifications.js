import { NOTIFICATIONS_PAGE_SIZE } from '@flash/shared';
import { toPublicNotification } from '../../domain/notifications.js';
import { isPostPublic } from '../../domain/posts.js';

export function createListNotifications({ notifications, posts, storage, clock }) {
  /**
   * Notifications from the last 7 days, newest first. Thumbnails are only
   * shown for posts that are still visible.
   */
  return async function listNotifications({ viewer, cursor }) {
    const now = clock.now();
    const [page, unreadCount] = await Promise.all([
      notifications.listActive(viewer.id, { now, cursor, limit: NOTIFICATIONS_PAGE_SIZE }),
      notifications.countUnread(viewer.id, { now }),
    ]);

    const postIds = [...new Set(page.items.map((item) => item.postId))];
    const relatedPosts = postIds.length > 0 ? await posts.findManyByIds(postIds) : new Map();

    const items = page.items.map((notification) => {
      const post = relatedPosts.get(notification.postId);
      return toPublicNotification(notification, {
        postImageUrl: isPostPublic(post) ? storage.publicUrl(post.imageKey) : null,
      });
    });

    return { items, unreadCount, nextCursor: page.nextCursor };
  };
}
