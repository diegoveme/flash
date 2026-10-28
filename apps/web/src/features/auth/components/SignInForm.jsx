import { Lock, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/Alert.jsx';
import { TextField } from '../../../components/TextField.jsx';
import { login } from '../../../lib/api/auth.js';

export function SignInForm({ onSignedIn, onForgotPassword }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your username or email and your password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await login({ identifier: identifier.trim(), password });
      onSignedIn(session);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}

      <TextField
        label="Username or email"
        icon={UserIcon}
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        autoComplete="username"
        placeholder="your_username or you@example.com"
        required
      />

      <div>
        <TextField
          label="Password"
          icon={Lock}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Your password"
          required
        />
        <button
          type="button"
          onClick={onForgotPassword}
          className="mt-1.5 text-[11px] text-primary hover:underline"
        >
          Forgot your password?
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-primary py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="text-center text-[11px] text-muted">Sessions last 24 hours.</p>
    </form>
  );
}
