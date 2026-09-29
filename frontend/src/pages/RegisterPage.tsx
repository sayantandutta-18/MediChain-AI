import { motion } from 'framer-motion';
import { ArrowLeft, HeartPulse, Stethoscope, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, toError } from '@/context/AuthContext';
import { useApiStatus } from '@/context/ApiStatusContext';
import { isApiOffline } from '@/api/client';
import { toFieldErrors } from '@/api/errors';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { ApiOfflineNotice } from '@/components/layout/ApiOfflineBanner';
import { Logo } from '@/components/ui/Logo';
import type { UserRole } from '@/types';

const ROLE_CARDS: Array<{ role: UserRole; title: string; blurb: string; icon: typeof HeartPulse }> = [
  { role: 'patient', title: 'Patient', blurb: 'I want to control my own records', icon: HeartPulse },
  { role: 'doctor', title: 'Doctor', blurb: 'I need consent-based access to records', icon: Stethoscope },
];

export const RegisterPage = () => {
  const { register } = useAuth();
  const { status: apiStatus, reportFailure } = useApiStatus();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('patient');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    hospital: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
        ...(role === 'doctor' && form.specialty.trim()
          ? { specialty: form.specialty.trim(), hospital: form.hospital.trim() || undefined }
          : {}),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiError = toError(err);
      reportFailure(err);
      // A dead API gets a dedicated panel, not a scary "Bad gateway" alert.
      setError(isApiOffline(apiError) ? null : apiError.message);
      setFieldErrors(isApiOffline(apiError) ? {} : toFieldErrors(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApiDown = apiStatus === 'offline';

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div
        className="pointer-events-none fixed inset-0 bg-grid-fade bg-grid [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass relative w-full max-w-lg p-6 sm:p-8"
      >
        <Logo to="/" />

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-white">Create your account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose your role — it determines what you can do inside MediChain-AI.
        </p>

        {error ? (
          <div className="mt-6">
            <Alert tone="danger" title="Registration failed">
              {error}
            </Alert>
          </div>
        ) : null}

        {isApiDown ? <ApiOfflineNotice className="mt-6" /> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <fieldset>
            <legend className="field-label">I am a</legend>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_CARDS.map((card) => {
                const isActive = role === card.role;
                return (
                  <button
                    key={card.role}
                    type="button"
                    onClick={() => setRole(card.role)}
                    aria-pressed={isActive}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      isActive
                        ? 'border-signal-400/50 bg-signal-400/10 shadow-glow-cyan'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <card.icon
                      className={`h-4 w-4 ${isActive ? 'text-signal-300' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-semibold text-white">{card.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{card.blurb}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="name" className="field-label">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
              className="field"
              placeholder={role === 'doctor' ? 'Dr. Jane Okafor' : 'Jane Okafor'}
            />
            {fieldErrors.name ? <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              className="field"
              placeholder="you@example.com"
            />
            {fieldErrors.email ? <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.email}</p> : null}
          </div>

          {role === 'doctor' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="specialty" className="field-label">
                  Specialty
                </label>
                <input
                  id="specialty"
                  type="text"
                  required
                  value={form.specialty}
                  onChange={update('specialty')}
                  className="field"
                  placeholder="Cardiology"
                />
                {fieldErrors.specialty ? (
                  <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.specialty}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="hospital" className="field-label">
                  Hospital
                </label>
                <input
                  id="hospital"
                  type="text"
                  value={form.hospital}
                  onChange={update('hospital')}
                  className="field"
                  placeholder="MediChain General"
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                className="field"
                placeholder="At least 8 characters"
              />
              {fieldErrors.password ? (
                <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1.5 text-[11px] text-slate-500">Uppercase, lowercase and a number.</p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="field-label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                className="field"
                placeholder="Repeat password"
              />
              {fieldErrors.confirmPassword ? (
                <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.confirmPassword}</p>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting || isApiDown}
          >
            {isSubmitting ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="link font-semibold">
            Sign in
          </Link>
        </p>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to overview
        </Link>
      </motion.div>
    </div>
  );
};
