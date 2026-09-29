import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui/Feedback';
import { AppLayout } from '@/components/layout/AppLayout';
import type { UserRole } from '@/types';

/** Requires an authenticated session. */
export const ProtectedRoute = () => {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState label="Restoring your secure session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

/** Frontend role checks are UI-only; the backend remains authoritative (TRD-4). */
export const RoleRoute = ({ roles }: { roles: UserRole[] }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="glass px-8 py-12">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-300" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-semibold text-white">This area is not available for your role</h1>
          <p className="mt-2 text-sm text-slate-400">
            You are signed in as a <span className="font-semibold text-slate-200">{user.role}</span>. This page requires{' '}
            <span className="font-semibold text-slate-200">{roles.join(' or ')}</span> access.
          </p>
          <a href="/dashboard" className="btn-primary mt-6">
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

/** Signed-in users skip the marketing/auth pages. */
export const PublicOnlyRoute = () => {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
