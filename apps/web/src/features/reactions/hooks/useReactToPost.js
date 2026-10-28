import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../../app/providers/authContext.js';
import { setReaction } from '../../../lib/api/reactions.js';
import { authPath } from '../../../lib/routing.js';

/**
 * Sends the viewer's reaction and reports the new counts to the owner of the post state.
 * Visitors are redirected to sign in (the API would reject them anyway).
 *
 * @param {(postId: string, patch: { viewerReaction: string, reactionsCount: object }) => void} onUpdated
 */
export function useReactToPost(onUpdated) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingPostId, setPendingPostId] = useState(null);
  const [error, setError] = useState(null);

  const react = useCallback(
    async (post, type) => {
      if (!user) {
        navigate(authPath(location.pathname + location.search));
        return;
      }
      if (post.viewerReaction === type) return;

      setPendingPostId(post.id);
      setError(null);
      try {
        const result = await setReaction(post.id, type);
        onUpdated(post.id, {
          viewerReaction: result.reaction.type,
          reactionsCount: result.reactionsCount,
        });
      } catch (err) {
        setError({ postId: post.id, message: err.message });
      } finally {
        setPendingPostId(null);
      }
    },
    [user, navigate, location.pathname, location.search, onUpdated],
  );

  return { react, pendingPostId, error };
}
