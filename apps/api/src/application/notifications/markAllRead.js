export function createMarkAllRead({ notifications, clock }) {
  return async function markAllRead({ viewer }) {
    await notifications.markAllRead(viewer.id, { now: clock.now() });
  };
}
