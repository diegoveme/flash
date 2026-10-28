import { COMMENT_MAX_LENGTH, countCharacters } from '@flash/shared';
import { Send } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Alert } from '../../../components/Alert.jsx';
import { authPath } from '../../../lib/routing.js';

/**
 * Comment box with a live character counter (code points, same rule as the API).
 * Visitors only see an invitation to sign in.
 */
export function CommentForm({ isSignedIn, onSubmit }) {
  const inputId = useId();
  const location = useLocation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isSignedIn) {
    return (
      <div className="mt-4 rounded border border-line bg-surface p-4 text-center text-xs text-subtle">
        Visitors browse in read-only mode.{' '}
        <Link
          to={authPath(location.pathname)}
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>{' '}
        to comment and react.
      </div>
    );
  }

  const length = countCharacters(text);
  const remaining = COMMENT_MAX_LENGTH - length;
  const isBlank = text.trim().length === 0;
  const isTooLong = remaining < 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBlank || isTooLong || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (err) {
      setError(err.fields?.content || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-line pt-4">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-ink">
        Leave a comment
      </label>
      <textarea
        id={inputId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        aria-invalid={isTooLong}
        aria-describedby={`${inputId}-counter`}
        placeholder="Share feedback on light, composition or technique..."
        className="field p-3"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          id={`${inputId}-counter`}
          className={`font-mono text-[11px] ${remaining < 50 ? 'font-semibold text-danger' : 'text-muted'}`}
        >
          {isTooLong
            ? `${-remaining} characters over the limit`
            : `${remaining} characters remaining`}
        </span>

        <button
          type="submit"
          disabled={submitting || isBlank || isTooLong}
          className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{submitting ? 'Posting...' : 'Post comment'}</span>
        </button>
      </div>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
    </form>
  );
}
