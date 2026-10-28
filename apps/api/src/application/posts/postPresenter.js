import { toPublicPost } from '../../domain/posts.js';

/**
 * Turns stored posts into public posts: CloudFront image URL plus the
 * viewer's own reaction, fetched in one batch per page.
 */
export function createPostPresenter({ reactions, storage }) {
  async function presentMany(posts, viewer) {
    const viewerReactions =
      viewer && posts.length > 0
        ? await reactions.findTypesForPosts(
            posts.map((post) => post.id),
            viewer.id,
          )
        : new Map();

    return posts.map((post) =>
      toPublicPost(post, {
        imageUrl: storage.publicUrl(post.imageKey),
        viewerReaction: viewerReactions.get(post.id) ?? null,
      }),
    );
  }

  return {
    presentMany,
    async presentOne(post, viewer) {
      const [presented] = await presentMany([post], viewer);
      return presented;
    },
  };
}
