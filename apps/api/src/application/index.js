import { createAuthenticate } from './auth/authenticate.js';
import { createGetCurrentUser } from './auth/getCurrentUser.js';
import { createLogin } from './auth/login.js';
import { createLogout } from './auth/logout.js';
import { createRegister } from './auth/register.js';
import { createRequestPasswordRecovery } from './auth/requestPasswordRecovery.js';
import { createResetPassword } from './auth/resetPassword.js';
import { createAddComment } from './comments/addComment.js';
import { createListComments } from './comments/listComments.js';
import { createGetUnreadCount } from './notifications/getUnreadCount.js';
import { createListNotifications } from './notifications/listNotifications.js';
import { createMarkAllRead } from './notifications/markAllRead.js';
import { createCreatePost } from './posts/createPost.js';
import { createGetPost } from './posts/getPost.js';
import { createHidePost } from './posts/hidePost.js';
import { createListFeed } from './posts/listFeed.js';
import { createPostPresenter } from './posts/postPresenter.js';
import { createSetReaction } from './reactions/setReaction.js';
import { createCreateUpload } from './uploads/createUpload.js';
import { createGetUploadExif } from './uploads/getUploadExif.js';
import { createGetProfile } from './users/getProfile.js';
import { createListUserPosts } from './users/listUserPosts.js';

/**
 * Builds every use case from its ports. Use cases are plain async functions.
 * @param {object} deps repositories, adapters, clock, config and logger
 */
export function createUseCases(deps) {
  const withPresenter = { ...deps, postPresenter: createPostPresenter(deps) };

  return Object.freeze({
    authenticate: createAuthenticate(deps),
    register: createRegister(deps),
    login: createLogin(deps),
    logout: createLogout(deps),
    getCurrentUser: createGetCurrentUser(deps),
    requestPasswordRecovery: createRequestPasswordRecovery(deps),
    resetPassword: createResetPassword(deps),

    listFeed: createListFeed(withPresenter),
    getPost: createGetPost(withPresenter),
    createPost: createCreatePost(withPresenter),
    hidePost: createHidePost(deps),

    getProfile: createGetProfile(deps),
    listUserPosts: createListUserPosts(withPresenter),

    createUpload: createCreateUpload(deps),
    getUploadExif: createGetUploadExif(deps),

    listComments: createListComments(deps),
    addComment: createAddComment(deps),

    setReaction: createSetReaction(deps),

    listNotifications: createListNotifications(deps),
    getUnreadCount: createGetUnreadCount(deps),
    markAllRead: createMarkAllRead(deps),
  });
}
