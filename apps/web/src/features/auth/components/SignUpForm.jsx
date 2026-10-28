import { MIN_SIGNUP_AGE, PASSWORD_MIN_LENGTH } from '@flash/shared';
import { Calendar, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/Alert.jsx';
import { TextField } from '../../../components/TextField.jsx';
import { register } from '../../../lib/api/auth.js';
import { latestBirthDateFor } from '../../../lib/format/date.js';
import { validateSignUp } from '../validation.js';

const EMPTY = { username: '', email: '', birthDate: '', password: '' };

export function SignUpForm({ onSignedIn }) {
  const [today] = useState(() => new Date());
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    const value = field === 'username' ? event.target.value.toLowerCase() : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateSignUp(values, today);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const session = await register({ ...values, email: values.email.trim() });
      onSignedIn(session);
    } catch (err) {
      setFieldErrors(err.fields ?? {});
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}

      <TextField
        label="Username"
        icon={UserIcon}
        value={values.username}
        onChange={update('username')}
        autoComplete="username"
        placeholder="e.g. street_lens"
        hint="Public. Lowercase letters, numbers, _ or ."
        error={fieldErrors.username}
        required
      />

      <TextField
        label="Email (private)"
        icon={Mail}
        type="email"
        value={values.email}
        onChange={update('email')}
        autoComplete="email"
        placeholder="you@example.com"
        hint="Never shown on your profile or in public responses."
        error={fieldErrors.email}
        required
      />

      <TextField
        label={`Date of birth (${MIN_SIGNUP_AGE}+)`}
        icon={Calendar}
        type="date"
        value={values.birthDate}
        onChange={update('birthDate')}
        max={latestBirthDateFor(MIN_SIGNUP_AGE, today)}
        autoComplete="bday"
        hint={`Used only to check you are at least ${MIN_SIGNUP_AGE}. Never shown publicly.`}
        error={fieldErrors.birthDate}
        required
      />

      <TextField
        label={`Password (min ${PASSWORD_MIN_LENGTH} characters)`}
        icon={Lock}
        type="password"
        value={values.password}
        onChange={update('password')}
        autoComplete="new-password"
        placeholder="Create a password"
        error={fieldErrors.password}
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-primary py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {submitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
