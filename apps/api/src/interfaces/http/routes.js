/**
 * Route table: single source for the local dev server and the route tests.
 * Each handler lives in `./handlers/<handler>.js` and exports `handler`.
 * Keep in sync with docs/api.md and infra/template.yaml.
 */
export const routes = Object.freeze([
  { method: 'POST', path: '/auth/register', handler: 'auth/register' },
  { method: 'POST', path: '/auth/login', handler: 'auth/login' },
  { method: 'POST', path: '/auth/logout', handler: 'auth/logout' },
  { method: 'GET', path: '/auth/me', handler: 'auth/me' },
  { method: 'POST', path: '/auth/password-recovery', handler: 'auth/requestPasswordRecovery' },
  { method: 'POST', path: '/auth/password-reset', handler: 'auth/resetPassword' },
  { method: 'GET', path: '/posts', handler: 'posts/listFeed' },
  { method: 'POST', path: '/posts', handler: 'posts/createPost' },
  { method: 'GET', path: '/posts/{postId}', handler: 'posts/getPost' },
  { method: 'DELETE', path: '/posts/{postId}', handler: 'posts/hidePost' },
  { method: 'GET', path: '/posts/{postId}/comments', handler: 'comments/listComments' },
  { method: 'POST', path: '/posts/{postId}/comments', handler: 'comments/addComment' },
  { method: 'PUT', path: '/posts/{postId}/reaction', handler: 'reactions/setReaction' },
  { method: 'GET', path: '/users/{username}', handler: 'users/getProfile' },
  { method: 'GET', path: '/users/{username}/posts', handler: 'users/listUserPosts' },
  { method: 'POST', path: '/uploads', handler: 'uploads/createUpload' },
  { method: 'GET', path: '/uploads/{uploadId}/exif', handler: 'uploads/getUploadExif' },
  { method: 'GET', path: '/notifications', handler: 'notifications/listNotifications' },
  { method: 'GET', path: '/notifications/unread-count', handler: 'notifications/getUnreadCount' },
  { method: 'POST', path: '/notifications/read-all', handler: 'notifications/markAllRead' },
]);
