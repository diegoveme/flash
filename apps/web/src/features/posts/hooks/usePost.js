import { useCallback, useEffect, useState } from 'react';
import { getPost } from '../../../lib/api/posts.js';

/**
 * Loads one post. Hidden or missing posts come back from the API as 404 and
 * end in the 'not-found' status. Remount (key) to load a different post.
 * @param {string} postId
 */
export function usePost(postId) {
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getPost(postId).then(
      (result) => {
        if (!active) return;
        setPost(result.post);
        setStatus('ready');
      },
      (err) => {
        if (!active) return;
        setError(err);
        setStatus(err?.status === 404 ? 'not-found' : 'error');
      },
    );
    return () => {
      active = false;
    };
  }, [postId]);

  const updatePost = useCallback((patch) => {
    setPost((current) =>
      current ? { ...current, ...(typeof patch === 'function' ? patch(current) : patch) } : current,
    );
  }, []);

  return { post, status, error, updatePost };
}
