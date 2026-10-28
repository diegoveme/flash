import { isPostPublic } from '../../domain/posts.js';
import { NotFoundError } from '../../lib/errors.js';
import { pathId } from '../../lib/params.js';

export function createGetPost({ posts, postPresenter }) {
  /** Hidden posts are reported as missing: the API never returns their detail. */
  return async function getPost({ postId, viewer }) {
    const post = await posts.findById(pathId(postId));
    if (!isPostPublic(post)) throw new NotFoundError('This post is not available.');
    return { post: await postPresenter.presentOne(post, viewer) };
  };
}
