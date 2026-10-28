/**
 * Storage layout. Raw uploads live under the owner's prefix, so a user can
 * only ever reference their own uploads; published images live under posts/.
 */
export function uploadObjectKey(userId, uploadId) {
  return `uploads/${userId}/${uploadId}`;
}

export function postObjectKey(postId, extension) {
  return `posts/${postId}.${extension}`;
}
