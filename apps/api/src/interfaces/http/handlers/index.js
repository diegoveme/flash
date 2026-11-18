/** Every route handler, keyed by the names used in ../routes.js. */
import { handler as authRegister } from './auth/register.js';
import { handler as authLogin } from './auth/login.js';
import { handler as authLogout } from './auth/logout.js';
import { handler as authMe } from './auth/me.js';
import { handler as authRequestPasswordRecovery } from './auth/requestPasswordRecovery.js';
import { handler as authResetPassword } from './auth/resetPassword.js';
import { handler as postsListFeed } from './posts/listFeed.js';
import { handler as postsCreatePost } from './posts/createPost.js';
import { handler as postsGetPost } from './posts/getPost.js';
import { handler as postsHidePost } from './posts/hidePost.js';
import { handler as commentsListComments } from './comments/listComments.js';
import { handler as commentsAddComment } from './comments/addComment.js';
import { handler as reactionsSetReaction } from './reactions/setReaction.js';
import { handler as usersGetProfile } from './users/getProfile.js';
import { handler as usersListUserPosts } from './users/listUserPosts.js';
import { handler as uploadsCreateUpload } from './uploads/createUpload.js';
import { handler as uploadsGetUploadExif } from './uploads/getUploadExif.js';
import { handler as notificationsListNotifications } from './notifications/listNotifications.js';
import { handler as notificationsGetUnreadCount } from './notifications/getUnreadCount.js';
import { handler as notificationsMarkAllRead } from './notifications/markAllRead.js';

export const handlers = Object.freeze({
  'auth/register': authRegister,
  'auth/login': authLogin,
  'auth/logout': authLogout,
  'auth/me': authMe,
  'auth/requestPasswordRecovery': authRequestPasswordRecovery,
  'auth/resetPassword': authResetPassword,
  'posts/listFeed': postsListFeed,
  'posts/createPost': postsCreatePost,
  'posts/getPost': postsGetPost,
  'posts/hidePost': postsHidePost,
  'comments/listComments': commentsListComments,
  'comments/addComment': commentsAddComment,
  'reactions/setReaction': reactionsSetReaction,
  'users/getProfile': usersGetProfile,
  'users/listUserPosts': usersListUserPosts,
  'uploads/createUpload': uploadsCreateUpload,
  'uploads/getUploadExif': uploadsGetUploadExif,
  'notifications/listNotifications': notificationsListNotifications,
  'notifications/getUnreadCount': notificationsGetUnreadCount,
  'notifications/markAllRead': notificationsMarkAllRead,
});
