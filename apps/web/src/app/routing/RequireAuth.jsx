import { Navigate, useLocation } from 'react-router';
import { LoadingState } from '../../components/Spinner.jsx';
import { authPath } from '../../lib/routing.js';
import { useAuth } from '../providers/authContext.js';

/** Visitors are read-only: protected screens send them to sign in and back. */
export function RequireAuth({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <LoadingState label="Checking your session" />;
  if (!user) return <Navigate to={authPath(location.pathname + location.search)} replace />;
  return children;
}
