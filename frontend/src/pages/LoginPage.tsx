import { motion } from 'framer-motion';
import { ArrowLeft, LogIn, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, toError } from '@/context/AuthContext';
import { useApiStatus } from '@/context/ApiStatusContext';
import { isApiOffline } from '@/api/client';
import { toFieldErrors } from '@/api/errors';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { ApiOfflineNotice } from '@/components/layout/ApiOfflineBanner';
import { Logo } from '@/components/ui/Logo';

export const LoginPage = () => {
  const { login } = useAuth();
  const { status: apiStatus, reportFailure } = useApiStatus();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(email.trim(), password, totpCode);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const apiError = toError(err);
      reportFailure(err);
      if (apiError.code === 'MFA_REQUIRED') {
          setRequiresMfa(true);
          setError('Two-factor authentication required.');
        } else {
          setError(isApiOffline(apiError) ? null : apiError.message);
      setFieldErrors(isApiOffline(apiError) ? {} : toFieldErrors(apiError));
        }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApiDown = apiStatus === 'offline';

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo to="/" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-10"
          >
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to reach your encrypted medical vault.
            </p>
          </motion.div>

          {error ? (
            <div className="mt-6">
              <Alert tone="danger" title="Sign in failed">
                {error}
              </Alert>
            </div>
          ) : null}

          {isApiDown ? <ApiOfflineNotice className="mt-6" /> : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {requiresMfa && (
                <div>
                  <label htmlFor="totp" className="field-label">
                    Authentication Code
                  </label>
                  <input
                    id="totp"
                    type="text"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="6-digit code"
                    className="field"
                  />
                </div>
              )}
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field"
                placeholder="you@example.com"
              />
              {fieldErrors.email ? <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.email}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field"
                placeholder="••••••••"
              />
              {fieldErrors.password ? (
                <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.password}</p>
              ) : null}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting || isApiDown}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            No account yet?{' '}
            <Link to="/register" className="link font-semibold">
              Create one
            </Link>
          </p>

          <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to overview
          </Link>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-white/[0.06] bg-ink-900/40 lg:block">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-fade bg-grid [mask-image:radial-gradient(60%_50%_at_60%_40%,black,transparent)]"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-center px-16">
          <ShieldCheck className="h-9 w-9 text-signal-400" aria-hidden="true" />
          <h2 className="mt-6 max-w-sm text-balance text-2xl font-bold leading-snug text-white">
            Authentication alone never unlocks a record.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Every read of a medical record passes an ownership or consent check on the server. A doctor
            additionally needs an approved, unexpired grant that you issued.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'AES-256-GCM encryption before persistence',
              'SHA-256 digest anchored on Sui testnet',
              'Time-bounded, revocable access grants',
              'Append-only audit trail for every action',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
};
