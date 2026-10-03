import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, Heart, Phone, AlertTriangle, Pill } from 'lucide-react';
import { emergencyApi } from '@/api/emergency';
import { Card } from '@/components/ui/Card';
import { ErrorState, Spinner } from '@/components/ui/Feedback';
import { Logo } from '@/components/ui/Logo';
import { formatDateTime } from '@/utils/format';
import type { EmergencyProfile } from '@/types';

export const EmergencyAccessPage = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ patientName: string; profile: EmergencyProfile } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    emergencyApi.accessByToken(token)
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load emergency profile'))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-signal-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg pt-12 px-6">
        <Logo to="/" />
        <div className="mt-8">
          <ErrorState message={error || 'Invalid or expired emergency token.'} />
          <Link to="/" className="btn-ghost mt-6 justify-center w-full">Return Home</Link>
        </div>
      </div>
    );
  }

  const { patientName, profile } = data;

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-rose-500" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-rose-500">Emergency Medical Profile</h1>
            <p className="text-xs text-rose-400/80">Authorized via secure QR token</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pt-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">{patientName}</h2>
            {profile.bloodGroup && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-sm font-semibold text-rose-300">
                <Heart className="h-4 w-4" />
                Blood: {profile.bloodGroup}
              </p>
            )}
          </div>
          {profile.organDonor && (
            <span className="rounded-xl border border-mint/20 bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint">
              Organ Donor
            </span>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-5 border-rose-500/20 bg-rose-500/[0.02]">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Allergies
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
              {profile.allergies.length > 0 ? (
                profile.allergies.map((item, i) => <li key={i}>• {item}</li>)
              ) : (
                <li className="text-slate-500">None reported</li>
              )}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Important Conditions
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
              {profile.conditions.length > 0 ? (
                profile.conditions.map((item, i) => <li key={i}>• {item}</li>)
              ) : (
                <li className="text-slate-500">None reported</li>
              )}
            </ul>
          </Card>
        </div>

        <Card className="mt-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-signal-400">
            <Pill className="h-4 w-4" />
            Current Medications
          </h3>
          <p className="mt-3 text-sm text-slate-300">
            {profile.medications.length > 0 ? profile.medications.join(', ') : <span className="text-slate-500">None reported</span>}
          </p>
        </Card>

        <Card className="mt-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Phone className="h-4 w-4" />
            Contacts
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/5 pb-3">
              <dt className="text-slate-500">Emergency Contact</dt>
              <dd className="text-right">
                <span className="block font-medium text-white">{profile.emergencyContactName || '—'}</span>
                <span className="block text-slate-400">{profile.emergencyContactPhone || '—'}</span>
              </dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-slate-500">Primary Doctor</dt>
              <dd className="text-right text-white">{profile.primaryDoctor || '—'}</dd>
            </div>
          </dl>
        </Card>

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-slate-600">
          Last updated: {formatDateTime(profile.updatedAt)}
        </p>
      </div>
    </div>
  );
};
