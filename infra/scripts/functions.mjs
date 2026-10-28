/**
 * Lambda functions deployed by infra/template.yaml, one per API route.
 *
 * Key: folder under infra/dist/ and suffix of the function name (flash-<stage>-<key>).
 * Value: handler module under apps/api/src/interfaces/http/handlers/ (see docs/api.md).
 *
 * Keep this list, infra/template.yaml and docs/api.md in sync.
 */
export const FUNCTIONS = Object.freeze({
  'auth-register': 'auth/register',
  'auth-login': 'auth/login',
  'auth-logout': 'auth/logout',
  'auth-me': 'auth/me',
  'auth-request-password-recovery': 'auth/requestPasswordRecovery',
  'auth-reset-password': 'auth/resetPassword',
  'posts-list-feed': 'posts/listFeed',
  'posts-create-post': 'posts/createPost',
  'posts-get-post': 'posts/getPost',
  'posts-hide-post': 'posts/hidePost',
  'comments-list-comments': 'comments/listComments',
  'comments-add-comment': 'comments/addComment',
  'reactions-set-reaction': 'reactions/setReaction',
  'users-get-profile': 'users/getProfile',
  'users-list-user-posts': 'users/listUserPosts',
  'uploads-create-upload': 'uploads/createUpload',
  'uploads-get-upload-exif': 'uploads/getUploadExif',
  'notifications-list': 'notifications/listNotifications',
  'notifications-get-unread-count': 'notifications/getUnreadCount',
  'notifications-mark-all-read': 'notifications/markAllRead',
});
