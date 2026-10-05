import { useEffect, useState } from 'react';
import { UserPlus, HeartPulse, Trash2 } from 'lucide-react';
import { apiClient } from '@/api/client';
import { SectionHeading, Card } from '@/components/ui/Card';
import { Spinner, ErrorState } from '@/components/ui/Feedback';
import { formatDateTime } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

interface Caregiver {
  _id: string;
  patientId: string;
  caregiverId: { _id: string; name: string; email: string };
  relation: string;
  isActive: boolean;
  createdAt: string;
}

export const CaregiversPage = () => {
  const { user } = useAuth();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchCaregivers = async () => {
    try {
      const { data } = await apiClient.get<{ data: Caregiver[] }>('/caregivers');
      setCaregivers(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load caregivers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await apiClient.post('/caregivers', { email, relation });
      setEmail('');
      setRelation('');
      await fetchCaregivers();
    } catch (err: any) {
      alert(err.message || 'Failed to add caregiver');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this caregiver?')) return;
    try {
      await apiClient.delete(/caregivers/);
      await fetchCaregivers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove caregiver');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6">
      <SectionHeading
        eyebrow="Access"
        title="Family & Caregivers"
        description="Manage family members or trusted caregivers who have persistent access to your records."
      />

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Add a Caregiver</h3>
        <form onSubmit={handleAdd} className="flex gap-4 items-end max-w-2xl">
          <div className="flex-1">
            <label className="field-label">Email Address</label>
            <input type="email" required className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="caregiver@example.com" />
          </div>
          <div className="flex-1">
            <label className="field-label">Relation</label>
            <input type="text" required className="field" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Spouse, Parent" />
          </div>
          <button type="submit" disabled={isAdding} className="btn-primary">
            {isAdding ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Add
          </button>
        </form>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8 text-blue-500" />
        </div>
      ) : error ? (
        <ErrorState title="Error" message={error} />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Active Caregivers</h3>
          {caregivers.length === 0 ? (
            <p className="text-slate-400">No active caregivers found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {caregivers.map((c) => (
                <div key={c._id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <HeartPulse className="h-8 w-8 text-rose-400" />
                    <div>
                      <p className="font-medium text-white">{c.caregiverId.name}</p>
                      <p className="text-sm text-slate-400">{c.caregiverId.email} • {c.relation}</p>
                      <p className="text-xs text-slate-500 mt-1">Granted {formatDateTime(c.createdAt)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(c.caregiverId._id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
