import { PASSWORD_RESET_TTL_MINUTES } from '@flash/shared';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/Alert.jsx';
import { TextField } from '../../../components/TextField.jsx';
import { requestPasswordRecovery } from '../../../lib/api/auth.js';

/**
 * Requests a reset link. The API answers the same way whether or not the
 * email exists, so this screen never reveals which emails are registered.
 */
export function RecoveryForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter the email of your account.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestPasswordRecovery(email.trim());
      setMessage(result?.message ?? 'If the email is registered, you will receive a link shortly.');
    } catch (err) {
      setError(err.fields?.email || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-xs leading-relaxed text-subtle">
        Enter your email and we will send you a link to choose a new password. The link works once
        and expires in {PASSWORD_RESET_TTL_MINUTES} minutes.
      </p>

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <TextField
        label="Account email"
        icon={Mail}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded border border-line bg-surface py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-raised disabled:opacity-60"
      >
        {submitting ? 'Sending...' : message ? 'Send the link again' : 'Send reset link'}
      </button>
    </form>
  );
}
