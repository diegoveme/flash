import { CircleCheck, KeyRound, Lock } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/Alert.jsx';
import { TextField } from '../../../components/TextField.jsx';
import { resetPassword } from '../../../lib/api/auth.js';
import { passwordError } from '../validation.js';

/**
 * Sets a new password with the single-use token from the email link.
 * If the link has no token (copied by hand), the token can be pasted.
 */
export function ResetPasswordForm({ initialToken, onDone, onRequestNewLink }) {
  const [token, setToken] = useState(initialToken ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [tokenRejected, setTokenRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="py-6 text-center">
        <CircleCheck className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden="true" />
        <h3 className="font-headline text-base font-semibold text-ink">Password updated</h3>
        <p className="mt-1 mb-4 text-xs text-subtle">
          The reset link can no longer be used. Sign in with your new password.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!token.trim()) errors.token = 'The reset token is missing.';
    const problem = passwordError(password);
    if (problem) errors.password = problem;
    else if (password !== confirmation) errors.confirmation = 'The passwords do not match.';
    setFieldErrors(errors);
    setError(null);
    setTokenRejected(false);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({ token: token.trim(), password });
      setDone(true);
    } catch (err) {
      setFieldErrors(err.fields ?? {});
      setTokenRejected(Boolean(err.fields?.token));
      setError(err.fields?.token ? null : err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      {tokenRejected && (
        <Alert variant="error">
          This reset link is invalid, was already used or has expired.{' '}
          <button type="button" onClick={onRequestNewLink} className="font-semibold underline">
            Request a new one
          </button>
          .
        </Alert>
      )}

      {!initialToken && (
        <TextField
          label="Reset token"
          icon={KeyRound}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          placeholder="Paste the token from the email"
          error={tokenRejected ? undefined : fieldErrors.token}
          className="font-mono"
          required
        />
      )}

      <TextField
        label="New password"
        icon={Lock}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        placeholder="New password"
        error={fieldErrors.password}
        required
      />

      <TextField
        label="Repeat the new password"
        icon={Lock}
        type="password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="new-password"
        placeholder="Repeat the password"
        error={fieldErrors.confirmation}
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-primary py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {submitting ? 'Saving...' : 'Save new password'}
      </button>
    </form>
  );
}
