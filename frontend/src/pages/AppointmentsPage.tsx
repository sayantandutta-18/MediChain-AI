import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { apiClient } from '@/api/client';
import { SectionHeading, Card } from '@/components/ui/Card';
import { Spinner, ErrorState } from '@/components/ui/Feedback';
import { formatDateTime } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

interface Appointment {
  _id: string;
  patientId: { _id: string; name: string; email: string };
  doctorId: { _id: string; name: string; email: string };
  date: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
}

export const AppointmentsPage = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      const { data } = await apiClient.get<{ data: Appointment[] }>('/appointments');
      setAppointments(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status });
      await fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6">
      <SectionHeading
        eyebrow="Schedule"
        title="Appointments"
        description="Manage your upcoming and past medical appointments."
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8 text-blue-500" />
        </div>
      ) : error ? (
        <ErrorState title="Error" message={error} />
      ) : (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-slate-400">No appointments found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {appointments.map((apt) => (
                <Card key={apt._id} className="p-5 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center text-blue-400">
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      <span className="font-semibold">{formatDateTime(apt.date)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      apt.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-300' :
                      apt.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-rose-500/20 text-rose-300'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4 flex-1">
                    <p className="text-white font-medium">
                      {user?.role === 'patient' ? `Dr. ${apt.doctorId.name}` : `Patient: ${apt.patientId.name}`}
                    </p>
                    {apt.notes && <p className="text-sm text-slate-400">{apt.notes}</p>}
                  </div>

                  {apt.status === 'SCHEDULED' && (
                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => updateStatus(apt._id, 'COMPLETED')} className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium flex items-center justify-center">
                        <Check className="h-4 w-4 mr-1" /> Complete
                      </button>
                      <button onClick={() => updateStatus(apt._id, 'CANCELLED')} className="flex-1 py-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors text-sm font-medium flex items-center justify-center">
                        <X className="h-4 w-4 mr-1" /> Cancel
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
