export function createGetUnreadCount({ notifications, clock }) {
  return async function getUnreadCount({ viewer }) {
    return { unreadCount: await notifications.countUnread(viewer.id, { now: clock.now() }) };
  };
}
