import { isNotificationActive } from '../../domain/notifications.js';
import { clone } from './memoryDatabase.js';
import { chronologicalKey, paginate } from './paginate.js';

/** @returns {import('../../application/ports.js').NotificationsRepository} */
export function createMemoryNotificationsRepository(db) {
  const { state } = db;
  const active = (recipientId, now) =>
    (state.notifications[recipientId] ?? []).filter((item) => isNotificationActive(item, now));

  return {
    async listActive(recipientId, { now, cursor, limit }) {
      const page = paginate(active(recipientId, now), {
        cursor,
        limit,
        keyOf: chronologicalKey,
        order: 'desc',
      });
      return { items: page.items.map(clone), nextCursor: page.nextCursor };
    },

    async countUnread(recipientId, { now }) {
      return active(recipientId, now).filter((item) => !item.read).length;
    },

    async markAllRead(recipientId, { now }) {
      for (const item of active(recipientId, now)) item.read = true;
      db.persist();
    },
  };
}
