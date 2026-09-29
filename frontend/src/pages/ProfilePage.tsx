import { useEffect, useState } from 'react';
import { KeyRound, Save, Stethoscope, User } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { toFieldErrors } from '@/api/errors';
import { formatDateTime, initials } from '@/utils/format';

export const ProfilePage = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    specialty: user?.specialty ?? '',
    hospital: user?.hospital ?? '',
    registrationNumber: user?.registrationNumber ?? '',
  });
  const [profileStatus, setProfileStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name,
      specialty: user.specialty ?? '',
      hospital: user.hospital ?? '',
      registrationNumber: user.registrationNumber ?? '',
    });
  }, [user]);

  if (!user) return null;

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileStatus(null);
    setProfileErrors({});
    try {
      await updateProfile({
        name: profile.name.trim(),
        ...(isDoctor
          ? {
              specialty: profile.specialty.trim() || undefined,
              hospital: profile.hospital.trim() || undefined,
              registrationNumber: profile.registrationNumber.trim() || undefined,
            }
          : {}),
      });
      setProfileStatus({ tone: 'success', message: 'Profile updated.' });
    } catch (err) {
      const apiError = toError(err);
      setProfileStatus({ tone: 'danger', message: apiError.message });
      setProfileErrors(toFieldErrors(apiError));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setIsSavingPassword(true);
    setPasswordStatus(null);
    setPasswordErrors({});
    try {
      await changePassword(passwords.currentPassword, passwords.newPassword);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStatus({ tone: 'success', message: 'Password changed. A new session token was issued.' });
    } catch (err) {
      const apiError = toError(err);
      setPasswordStatus({ tone: 'danger', message: apiError.message });
      setPasswordErrors(toFieldErrors(apiError));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Account"
        title="Profile & security"
        description="Manage the details patients and doctors see when you request or grant access."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card className="h-fit p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-signal-400/25 bg-signal-400/10 text-xl font-bold text-signal-200">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">{user.name}</p>
              <p className="truncate text-sm text-slate-400">{user.email}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs capitalize text-signal-300">
                {isDoctor ? <Stethoscope className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {user.role}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-2.5 border-t border-white/[0.06] pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Member since</dt>
              <dd className="text-slate-300">{formatDateTime(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Last sign in</dt>
              <dd className="text-slate-300">{formatDateTime(user.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Account status</dt>
              <dd className={user.isActive ? 'text-mint' : 'text-rose-300'}>
                {user.isActive ? 'Active' : 'Deactivated'}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="section-title">Personal details</h2>
            {profileStatus ? (
              <div className="mt-4">
                <Alert tone={profileStatus.tone}>{profileStatus.message}</Alert>
              </div>
            ) : null}

            <form onSubmit={handleProfileSave} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="profile-name" className="field-label">
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  className="field"
                />
                {profileErrors.name ? <p className="mt-1.5 text-xs text-rose-300">{profileErrors.name}</p> : null}
              </div>

              <div>
                <label htmlFor="profile-email" className="field-label">
                  Email
                </label>
                <input id="profile-email" type="email" value={user.email} disabled className="field" />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  The email identifies your account and cannot be changed here.
                </p>
              </div>

              {isDoctor ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-specialty" className="field-label">
                      Specialty
                    </label>
                    <input
                      id="profile-specialty"
                      type="text"
                      value={profile.specialty}
                      onChange={(event) => setProfile((prev) => ({ ...prev, specialty: event.target.value }))}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-registration" className="field-label">
                      Registration no.
                    </label>
                    <input
                      id="profile-registration"
                      type="text"
                      value={profile.registrationNumber}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, registrationNumber: event.target.value }))
                      }
                      className="field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="profile-hospital" className="field-label">
                      Hospital
                    </label>
                    <input
                      id="profile-hospital"
                      type="text"
                      value={profile.hospital}
                      onChange={(event) => setProfile((prev) => ({ ...prev, hospital: event.target.value }))}
                      className="field"
                    />
                  </div>
                </div>
              ) : null}

              <button type="submit" className="btn-primary" disabled={isSavingProfile}>
                {isSavingProfile ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {isSavingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </Card>

          <Card className="p-6" delay={0.05}>
            <h2 className="section-title flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-signal-300" aria-hidden="true" />
              Change password
            </h2>
            {passwordStatus ? (
              <div className="mt-4">
                <Alert tone={passwordStatus.tone}>{passwordStatus.message}</Alert>
              </div>
            ) : null}

            <form onSubmit={handlePasswordSave} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="current-password" className="field-label">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  className="field"
                />
                {passwordErrors.currentPassword ? (
                  <p className="mt-1.5 text-xs text-rose-300">{passwordErrors.currentPassword}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-password" className="field-label">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(event) => setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))}
                    className="field"
                  />
                  {passwordErrors.newPassword ? (
                    <p className="mt-1.5 text-xs text-rose-300">{passwordErrors.newPassword}</p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="confirm-password" className="field-label">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(event) =>
                      setPasswords((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    className="field"
                  />
                  {passwordErrors.confirmPassword ? (
                    <p className="mt-1.5 text-xs text-rose-300">{passwordErrors.confirmPassword}</p>
                  ) : null}
                </div>
              </div>

              <button type="submit" className="btn-ghost" disabled={isSavingPassword}>
                {isSavingPassword ? <Spinner className="h-4 w-4" /> : null}
                {isSavingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
