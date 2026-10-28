import { NOTIFICATION_TTL_DAYS } from '@flash/shared';
import { Bell, CheckCheck, Clock, LogOut } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../app/providers/authContext.js';
import { Alert } from '../../components/Alert.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadMore } from '../../components/LoadMore.jsx';
import { LoadingState } from '../../components/Spinner.jsx';
import { useCursorList } from '../../hooks/useCursorList.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useNow } from '../../hooks/useNow.js';
import { listNotifications, markAllRead } from '../../lib/api/notifications.js';
import { paths } from '../../lib/routing.js';
import { NotificationItem } from './components/NotificationItem.jsx';
import { useUnreadCount } from './unread/unreadCountContext.js';

/** Screen 5: notifications from the last 7 days, unread count, mark all as read and sign out. */
export function NotificationsScreen() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount, setUnreadCount } = useUnreadCount();
  const now = useNow();
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(null);

  useDocumentTitle('Notifications');

  // Each page also carries the unread count, which keeps the navbar badge in sync.
  const fetchPage = useCallback(
    async (cursor) => {
      const page = await listNotifications(cursor);
      setUnreadCount(page.unreadCount);
      return page;
    },
    [setUnreadCount],
  );
  const notifications = useCursorList(fetchPage);

  const handleMarkAllRead = async () => {
    setMarking(true);
    setMarkError(null);
    try {
      await markAllRead();
      notifications.setItems((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setMarkError(err.message);
    } finally {
      setMarking(false);
    }
  };

  // Leave the protected screen first so it does not bounce to the sign-in page.
  const handleSignOut = () => {
    navigate(paths.feed(), { replace: true });
    signOut();
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl font-bold text-ink sm:text-3xl">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Comments and first reactions on your photos from the last {NOTIFICATION_TTL_DAYS} days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={marking}
              className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised disabled:opacity-60"
            >
              <CheckCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{marking ? 'Marking...' : 'Mark all as read'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out and end this session on the server"
            className="inline-flex items-center gap-1.5 rounded border border-danger-soft bg-danger-soft/20 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft/50"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {markError && (
        <Alert variant="error" className="mb-4">
          {markError}
        </Alert>
      )}

      {notifications.isLoading && <LoadingState label="Loading notifications" />}

      {notifications.status === 'error' && (
        <Alert variant="error">{notifications.error.message}</Alert>
      )}

      {!notifications.isLoading &&
        notifications.status !== 'error' &&
        notifications.items.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No recent activity"
            description={`When members react to or comment on your photos, it will show up here for ${NOTIFICATION_TTL_DAYS} days.`}
          />
        )}

      {notifications.items.length > 0 && (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-canvas">
            {notifications.items.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} now={now} />
            ))}
          </ul>
          <LoadMore
            hasMore={notifications.hasMore}
            loading={notifications.isLoadingMore}
            error={notifications.loadMoreError}
            onLoadMore={notifications.loadMore}
            label="Load older notifications"
            endLabel="No older notifications"
          />
        </>
      )}

      <div className="mt-8 flex items-start gap-2.5 rounded-lg border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          <strong className="text-ink">Retention:</strong> notifications expire after{' '}
          {NOTIFICATION_TTL_DAYS} days and stop appearing here. Changing a reaction does not notify
          the author again.
        </p>
      </div>
    </div>
  );
}
