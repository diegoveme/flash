import { useCallback, useState } from 'react';
import { hidePost } from '../../../lib/api/posts.js';

const IDLE = { postId: null, busy: false, error: null };

/**
 * Confirm-then-hide flow for the author's own posts (logical delete, visible = false).
 * `confirm` resolves with the hidden post id, or null if it failed.
 */
export function useHidePost() {
  const [state, setState] = useState(IDLE);

  const request = useCallback((postId) => setState({ ...IDLE, postId }), []);
  const cancel = useCallback(() => setState(IDLE), []);

  const confirm = useCallback(async () => {
    const { postId } = state;
    if (!postId) return null;
    setState((current) => ({ ...current, busy: true, error: null }));
    try {
      await hidePost(postId);
    } catch (err) {
      // 404 means it is already hidden: the outcome the author wanted.
      if (err?.status !== 404) {
        setState((current) => ({ ...current, busy: false, error: err.message }));
        return null;
      }
    }
    setState(IDLE);
    return postId;
  }, [state]);

  return {
    targetPostId: state.postId,
    busy: state.busy,
    error: state.error,
    request,
    cancel,
    confirm,
  };
}
