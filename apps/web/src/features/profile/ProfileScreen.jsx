import { ArrowLeft, Camera, UserX } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../../app/providers/authContext.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingState } from '../../components/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listUserPosts } from '../../lib/api/users.js';
import { paths } from '../../lib/routing.js';
import { PostFeed } from '../feed/components/PostFeed.jsx';
import { ProfileHeader } from './components/ProfileHeader.jsx';
import { useProfile } from './hooks/useProfile.js';

const backLinkClass =
  'inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-colors hover:text-primary';

/** Public profile: a variant of the feed filtered by one photographer. */
export function ProfileScreen() {
  const { username } = useParams();
  const { status, user } = useAuth();

  if (status === 'checking') return <LoadingState label="Loading profile" />;
  return <Profile key={`${username}:${user?.id ?? 'visitor'}`} username={username} />;
}

function Profile({ username }) {
  const { user } = useAuth();
  const { profile, status, error } = useProfile(username);
  const fetchPage = useCallback((cursor) => listUserPosts(username, cursor), [username]);
  const isSelf = Boolean(user && profile && user.id === profile.id);

  useDocumentTitle(`@${username}`);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to={paths.feed()} className={backLinkClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to all photos</span>
        </Link>
      </div>

      {status === 'loading' && <LoadingState label="Loading profile" />}

      {(status === 'not-found' || status === 'error') && (
        <EmptyState
          icon={UserX}
          title={status === 'not-found' ? 'Photographer not found' : 'Could not load this profile'}
          description={
            status === 'not-found' ? `There is no member called @${username}.` : error?.message
          }
        />
      )}

      {status === 'ready' && (
        <>
          <ProfileHeader profile={profile} isSelf={isSelf} />

          <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
            <h2 className="font-headline text-lg font-semibold text-ink">Gallery</h2>
            <span className="font-mono text-xs text-muted">Newest first</span>
          </div>

          <PostFeed
            fetchPage={fetchPage}
            showAuthor={false}
            empty={
              <EmptyState
                icon={Camera}
                title="No visible photos"
                description={
                  isSelf
                    ? 'You have not published any photos yet.'
                    : `@${profile.username} has not published any photos yet.`
                }
                action={
                  isSelf && (
                    <Link
                      to={paths.newPost()}
                      className="inline-block rounded bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
                    >
                      Publish your first photo
                    </Link>
                  )
                }
              />
            }
          />
        </>
      )}
    </div>
  );
}
