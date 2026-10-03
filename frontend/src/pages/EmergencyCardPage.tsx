import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Save, ShieldAlert, KeyRound, QrCode } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { emergencyApi } from '@/api/emergency';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { formatDateTime } from '@/utils/format';
import type { EmergencyToken } from '@/types';

export const EmergencyCardPage = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<EmergencyToken | null>(null);
  
  const [formData, setFormData] = useState({
    bloodGroup: '',
    allergies: '',
    medications: '',
    conditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    organDonor: false,
    primaryDoctor: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const p = await emergencyApi.getProfile();
      setFormData({
        bloodGroup: p.bloodGroup ?? '',
        allergies: p.allergies.join(', '),
        medications: p.medications.join(', '),
        conditions: p.conditions.join(', '),
        emergencyContactName: p.emergencyContactName ?? '',
        emergencyContactPhone: p.emergencyContactPhone ?? '',
        organDonor: p.organDonor,
        primaryDoctor: p.primaryDoctor ?? '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'patient') {
      void loadProfile();
    }
  }, [user, loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);
    try {
      await emergencyApi.updateProfile({
        bloodGroup: formData.bloodGroup.trim() || undefined,
        allergies: formData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        medications: formData.medications.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: formData.conditions.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        organDonor: formData.organDonor,
        primaryDoctor: formData.primaryDoctor.trim() || undefined,
      });
      setStatus({ tone: 'success', message: 'Emergency profile updated.' });
    } catch (err) {
      setStatus({ tone: 'danger', message: toError(err).message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    try {
      const t = await emergencyApi.generateToken();
      setToken(t);
    } catch (err) {
      setStatus({ tone: 'danger', message: toError(err).message });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  if (!user || user.role !== 'patient') return null;

  return (
    <div>
      <SectionHeading
        eyebrow="Emergency Setup"
        title="Emergency Health Card"
        description="Crucial information for first responders. Generate a secure QR code for emergency access."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <h2 className="section-title flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" aria-hidden="true" />
            Medical details
          </h2>
          {status ? (
            <div className="mt-4">
              <Alert tone={status.tone}>{status.message}</Alert>
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-5 flex justify-center py-8">
              <Spinner className="h-8 w-8 text-signal-400" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Blood group</label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                    className="field"
                    placeholder="O+, A-, etc."
                  />
                </div>
                <div>
                  <label className="field-label">Primary doctor</label>
                  <input
                    type="text"
                    value={formData.primaryDoctor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, primaryDoctor: e.target.value }))}
                    className="field"
                    placeholder="Dr. Smith"
                  />
                </div>
              </div>
              
              <div>
                <label className="field-label">Allergies</label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allergies: e.target.value }))}
                  className="field"
                  placeholder="Comma-separated list"
                />
              </div>
              <div>
                <label className="field-label">Medications</label>
                <input
                  type="text"
                  value={formData.medications}
                  onChange={(e) => setFormData((prev) => ({ ...prev, medications: e.target.value }))}
                  className="field"
                  placeholder="Current medications"
                />
              </div>
              <div>
                <label className="field-label">Important conditions</label>
                <input
                  type="text"
                  value={formData.conditions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, conditions: e.target.value }))}
                  className="field"
                  placeholder="Asthma, Diabetes, etc."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Emergency contact name</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                    className="field"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="field-label">Emergency contact phone</label>
                  <input
                    type="text"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                    className="field"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="organ-donor"
                  type="checkbox"
                  checked={formData.organDonor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organDonor: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-mint focus:ring-mint/20 focus:ring-offset-0"
                />
                <label htmlFor="organ-donor" className="text-sm font-medium text-slate-300">
                  Registered organ donor
                </label>
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Saving…' : 'Save details'}
                </button>
              </div>
            </form>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="section-title flex items-center gap-2">
              <QrCode className="h-4 w-4 text-signal-300" aria-hidden="true" />
              Emergency Access QR
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Generate a temporary QR code that gives first responders access to your emergency profile. Full medical records remain private.
            </p>
            
            <div className="mt-5">
              {!token ? (
                <button 
                  onClick={() => void handleGenerateToken()} 
                  disabled={isGeneratingToken}
                  className="btn-ghost w-full justify-center"
                >
                  {isGeneratingToken ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                  Generate 24hr QR
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-mint/20 bg-mint/[0.03] p-6 text-center">
                  <div className="rounded-xl bg-white p-3 shadow-lg">
                    <QRCodeSVG 
                      value={`${window.location.origin}/emergency/${token.token}`} 
                      size={180}
                      level="Q"
                      includeMargin={false}
                    />
                  </div>
                  <p className="mt-4 text-xs font-semibold text-mint">
                    Scan for emergency details
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Expires at {formatDateTime(token.expiresAt)}
                  </p>
                  <button 
                    onClick={() => void handleGenerateToken()} 
                    className="btn-ghost btn-sm mt-4 w-full justify-center text-xs"
                  >
                    Regenerate token
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
