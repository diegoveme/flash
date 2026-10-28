import { createBrowserRouter } from 'react-router';
import { AuthScreen } from '../features/auth/AuthScreen.jsx';
import { FeedScreen } from '../features/feed/FeedScreen.jsx';
import { NewPostScreen } from '../features/new-post/NewPostScreen.jsx';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen.jsx';
import { PostDetailScreen } from '../features/posts/PostDetailScreen.jsx';
import { ProfileScreen } from '../features/profile/ProfileScreen.jsx';
import { App } from './App.jsx';
import { NotFound } from './routing/NotFound.jsx';
import { RequireAuth } from './routing/RequireAuth.jsx';
import { RouteError } from './routing/RouteError.jsx';

/**
 * The five main screens plus the public profile, which is the feed
 * filtered by one user.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      // Screen 2: feed
      { index: true, element: <FeedScreen /> },
      // Feed variant: public profile
      { path: 'u/:username', element: <ProfileScreen /> },
      // Screen 4: post detail
      { path: 'posts/:postId', element: <PostDetailScreen /> },
      // Screen 3: new post
      {
        path: 'new',
        element: (
          <RequireAuth>
            <NewPostScreen />
          </RequireAuth>
        ),
      },
      // Screen 5: notifications
      {
        path: 'notifications',
        element: (
          <RequireAuth>
            <NotificationsScreen />
          </RequireAuth>
        ),
      },
      // Screen 1: sign in / sign up / recovery (and the reset step inside it)
      { path: 'auth', element: <AuthScreen key="access" /> },
      { path: 'auth/reset', element: <AuthScreen key="reset" mode="reset" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
