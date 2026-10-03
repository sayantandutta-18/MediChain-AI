import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { apiClient } from '@/api/client';
import { formatDateTime, titleCase } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';

interface SecurityEvent {
  _id: string;
  type: string;
  ipAddress: string;
  userAgent?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
  createdAt: string;
}

export const SecurityCenterPage = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await apiClient.get<{ success: boolean; data: { items: SecurityEvent[] } }>(
          '/security/events'
        );
        setEvents(data.data.items);
      } catch (err) {
        console.error('Failed to load security events', err);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchEvents();
  }, []);

  if (isLoading) {
    return <LoadingState label="Loading security events..." />;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'high':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'critical':
        return 'text-rose-500 bg-rose-500/20 border-rose-500/30 font-bold';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes('SUCCESS')) return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
    if (type.includes('FAILED') || type.includes('UNAUTHORIZED')) return <ShieldAlert className="h-5 w-5 text-rose-400" />;
    return <ShieldQuestion className="h-5 w-5 text-blue-400" />;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Center</h1>
          <p className="text-slate-400 mt-1">Review active sessions and security anomalies.</p>
        </div>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <EmptyState
            title="No security events"
            description="Your account is secure with no recorded anomalies."
          />
        ) : (
          events.map((event) => (
            <div
              key={event._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <div className="mt-1">{getEventIcon(event.type)}</div>
                <div>
                  <h3 className="text-lg font-medium text-white flex items-center space-x-3">
                    {titleCase(event.type.replace(/_/g, ' '))}
                    <Badge label={titleCase(event.severity)} className={`ml-3 ${getSeverityColor(event.severity)}`} />
                  </h3>
                  <div className="text-sm text-slate-400 mt-2 space-y-1">
                    <p>IP Address: <span className="font-mono text-slate-300">{event.ipAddress}</span></p>
                    {event.userAgent && (
                      <p className="line-clamp-1 max-w-lg" title={event.userAgent}>
                        Device: {event.userAgent}
                      </p>
                    )}
                    {event.details && Object.keys(event.details).length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {JSON.stringify(event.details)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 text-right text-sm text-slate-500 whitespace-nowrap">
                {formatDateTime(event.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
