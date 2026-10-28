import { Aperture, Bell, LogOut, Plus, User as UserIcon } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router';
import { Avatar } from '../../components/Avatar.jsx';
import { useUnreadCount } from '../../features/notifications/unread/unreadCountContext.js';
import { paths } from '../../lib/routing.js';
import { useAuth } from '../providers/authContext.js';

const navLinkClass = ({ isActive }) =>
  `rounded px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
    isActive ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
  }`;

export function Navbar() {
  const { user, signOut } = useAuth();
  const { unreadCount } = useUnreadCount();
  const navigate = useNavigate();

  // Leave any protected screen first so it does not bounce to the sign-in page.
  const handleSignOut = () => {
    navigate(paths.feed());
    signOut();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            to={paths.feed()}
            className="group flex items-center gap-2.5"
            aria-label="Flash home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded bg-ink shadow-sm transition-transform group-hover:scale-105">
              <Aperture className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <span>
              <span className="font-headline text-xl font-extrabold tracking-tight text-ink">
                FLASH
              </span>
              <span className="ml-2 hidden border-l border-line pl-2 text-[10px] font-semibold tracking-widest text-muted uppercase sm:inline-block">
                Exhibition Space
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLink to={paths.feed()} end className={navLinkClass}>
              Feed
            </NavLink>
            {user && (
              <NavLink to={paths.profile(user.username)} className={navLinkClass}>
                My Gallery
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to={paths.newPost()}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded px-3.5 py-2 text-xs font-semibold tracking-wide text-white shadow-sm transition-colors ${
                isActive ? 'bg-primary-hover' : 'bg-primary hover:bg-primary-hover'
              }`
            }
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            <span className="hidden sm:inline">New Post</span>
            <span className="sr-only sm:hidden">New post</span>
          </NavLink>

          {user ? (
            <>
              <NavLink
                to={paths.notifications()}
                title="Notifications (last 7 days)"
                className={({ isActive }) =>
                  `relative rounded p-2 transition-colors ${
                    isActive
                      ? 'bg-surface-raised text-ink'
                      : 'text-muted hover:bg-surface hover:text-ink'
                  }`
                }
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">
                  Notifications{unreadCount > 0 ? `, ${unreadCount} unread` : ''}
                </span>
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-white shadow-sm"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>

              <div className="flex items-center gap-2 border-l border-line pl-2">
                <Link
                  to={paths.profile(user.username)}
                  className="group flex items-center gap-2"
                  title="View your public profile"
                >
                  <Avatar
                    username={user.username}
                    className="transition-colors group-hover:border-primary"
                  />
                  <span className="hidden text-xs font-semibold text-ink group-hover:text-primary lg:inline">
                    @{user.username}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="rounded p-2 text-muted transition-colors hover:bg-danger-soft/20 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden rounded border border-line bg-surface px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted md:inline">
                Visitor Mode
              </span>
              <Link
                to="/auth"
                className="flex items-center gap-1.5 rounded border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised"
              >
                <UserIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
