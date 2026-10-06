import { useEffect, useState } from 'react';
import { Pill, Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { apiClient } from '@/api/client';
import { SectionHeading, Card } from '@/components/ui/Card';
import { Spinner, ErrorState } from '@/components/ui/Feedback';
import { formatDateTime } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

interface Prescription {
  _id: string;
  patientId: { _id: string; name: string; email: string };
  doctorId: { _id: string; name: string; email: string };
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export const PrescriptionsPage = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    try {
      const { data } = await apiClient.get<{ data: Prescription[] }>('/prescriptions');
      setPrescriptions(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load prescriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/prescriptions/${id}/status`, { status });
      await fetchPrescriptions();
    } catch (err: any) {
      alert(err.message || 'Failed to update prescription');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6">
      <SectionHeading
        eyebrow="Treatment"
        title="Prescriptions & Medications"
        description="Track your active medications and prescription history."
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8 text-blue-500" />
        </div>
      ) : error ? (
        <ErrorState title="Error" message={error} />
      ) : (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <p className="text-slate-400">No prescriptions found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prescriptions.map((rx) => (
                <Card key={rx._id} className="p-5 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center text-rose-400">
                      <Pill className="h-5 w-5 mr-2" />
                      <span className="font-bold text-lg text-white">{rx.medicationName}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      rx.status === 'ACTIVE' ? 'bg-blue-500/20 text-blue-300' :
                      rx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {rx.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-4 flex-1">
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 space-y-1">
                      <p className="text-sm text-slate-300"><span className="text-slate-500">Dosage:</span> {rx.dosage}</p>
                      <p className="text-sm text-slate-300"><span className="text-slate-500">Frequency:</span> {rx.frequency}</p>
                    </div>
                    
                    <p className="text-sm text-slate-400">
                      {user?.role === 'patient' ? `Prescribed by Dr. ${rx.doctorId.name}` : `Patient: ${rx.patientId.name}`}
                    </p>
                    
                    <div className="flex items-center text-xs text-slate-500">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {formatDateTime(rx.startDate)} {rx.endDate ? ` - ${formatDateTime(rx.endDate)}` : ' - Ongoing'}
                    </div>
                    
                    {rx.notes && <p className="text-sm text-slate-400 mt-2">{rx.notes}</p>}
                  </div>

                  {rx.status === 'ACTIVE' && (
                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => updateStatus(rx._id, 'COMPLETED')} className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium flex items-center justify-center">
                        <Check className="h-4 w-4 mr-1" /> Mark Complete
                      </button>
                      <button onClick={() => updateStatus(rx._id, 'CANCELLED')} className="flex-1 py-2 bg-slate-500/10 text-slate-400 rounded-lg hover:bg-slate-500/20 transition-colors text-sm font-medium flex items-center justify-center">
                        <X className="h-4 w-4 mr-1" /> Stop
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};