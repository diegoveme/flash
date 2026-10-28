import { Aperture } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../app/providers/authContext.js';
import { LoadingState } from '../../components/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { safeNextPath } from '../../lib/routing.js';
import { RecoveryForm } from './components/RecoveryForm.jsx';
import { ResetPasswordForm } from './components/ResetPasswordForm.jsx';
import { SignInForm } from './components/SignInForm.jsx';
import { SignUpForm } from './components/SignUpForm.jsx';

const TABS = [
  { id: 'signin', label: 'Sign In', title: 'Sign in' },
  { id: 'signup', label: 'Register', title: 'Create account' },
  { id: 'recovery', label: 'Recovery', title: 'Password recovery' },
];

function initialTab(param) {
  return TABS.some((tab) => tab.id === param) ? param : 'signin';
}

/**
 * Screen 1: sign in, sign up and password recovery. `/auth/reset?token=...`
 * renders the reset form inside this same screen.
 */
export function AuthScreen({ mode = 'access' }) {
  const { status, user, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => initialTab(searchParams.get('tab')));
  const baseId = useId();
  const isReset = mode === 'reset';
  const next = safeNextPath(searchParams.get('next'));

  useDocumentTitle(isReset ? 'Reset password' : TABS.find((item) => item.id === tab).title);

  if (!isReset && status === 'checking') return <LoadingState label="Checking your session" />;
  // Signing in re-renders this screen with a user, which sends them where they were going.
  if (!isReset && user) return <Navigate to={next} replace />;

  return (
    <div className="mx-auto max-w-md animate-fade-in px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-ink shadow-md">
          <Aperture className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-headline text-2xl font-extrabold text-ink">FLASH</h1>
        <p className="mt-1 text-xs tracking-wider text-muted uppercase">
          Photography community space
        </p>
      </div>

      {isReset ? (
        <div className="rounded-lg border border-line bg-canvas p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 font-headline text-base font-semibold text-ink">
            Choose a new password
          </h2>
          <ResetPasswordForm
            initialToken={searchParams.get('token')}
            onDone={() => navigate('/auth', { replace: true })}
            onRequestNewLink={() => navigate('/auth?tab=recovery', { replace: true })}
          />
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Account access"
            className="mb-6 flex rounded-lg border border-line bg-surface p-1"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                id={`${baseId}-${item.id}-tab`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`${baseId}-panel`}
                onClick={() => setTab(item.id)}
                className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                  tab === item.id ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-${tab}-tab`}
            className="rounded-lg border border-line bg-canvas p-6 shadow-sm sm:p-8"
          >
            {tab === 'signin' && (
              <SignInForm onSignedIn={signIn} onForgotPassword={() => setTab('recovery')} />
            )}
            {tab === 'signup' && <SignUpForm onSignedIn={signIn} />}
            {tab === 'recovery' && <RecoveryForm />}
          </div>
        </>
      )}

      <div className="mt-6 text-center">
        <Link to="/" className="text-xs text-muted transition-colors hover:text-ink">
          Continue as a visitor
        </Link>
      </div>
    </div>
  );
}
