/**
 * Only allow redirects to paths inside the app ("/x"), never to other origins
 * ("//evil.example" or "https://...").
 * @param {string | null | undefined} next
 * @param {string} [fallback]
 */
export function safeNextPath(next, fallback = '/') {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.startsWith('/auth')) return fallback;
  return next;
}

/**
 * Sign-in URL that returns the user to `next` afterwards.
 * @param {string} [next]
 */
export function authPath(next) {
  const target = safeNextPath(next, '');
  return target ? `/auth?next=${encodeURIComponent(target)}` : '/auth';
}

export const paths = {
  feed: () => '/',
  post: (postId) => `/posts/${encodeURIComponent(postId)}`,
  profile: (username) => `/u/${encodeURIComponent(username)}`,
  newPost: () => '/new',
  notifications: () => '/notifications',
};
