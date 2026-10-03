import { useEffect, useState } from 'react';
import { Activity, Calendar, FileText, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

import { formatDateTime, titleCase } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/Feedback';

interface TimelineEvent {
  eventId: string;
  recordId: string;
  title: string;
  category: string;
  versionNumber: number;
  fileName: string;
  size: number;
  createdAt: string;
  type: 'CREATED' | 'UPDATED';
  blockchain: {
    status: string;
    onChainHash?: string;
  };
}

export const TimelinePage = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const { data } = await apiClient.get<{ success: boolean; data: { timeline: TimelineEvent[] } }>(
          '/records/timeline'
        );
        setEvents(data.data.timeline);
      } catch (err) {
        console.error('Failed to load timeline', err);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchTimeline();
  }, []);

  if (isLoading) {
    return <LoadingState label="Loading your health timeline..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Medical Timeline</h1>
        <p className="text-slate-400 mt-1">A chronological history of all your medical records and updates.</p>
      </div>

      <div className="relative border-l border-slate-700 ml-4 space-y-8 pb-8">
        {events.length === 0 ? (
          <div className="ml-8 text-slate-400">No medical events recorded yet.</div>
        ) : (
          events.map((event) => (
            <div key={event.eventId} className="relative ml-8">
              {/* Timeline dot */}
              <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-slate-600 ring-4 ring-slate-950">
                {event.type === 'CREATED' ? (
                  <UploadCloud className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Activity className="h-4 w-4 text-blue-400" />
                )}
              </span>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-700 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateTime(event.createdAt)}</span>
                    <span className="text-slate-600">•</span>
                    <Badge
                      label={event.type === 'CREATED' ? 'Initial Upload' : `Version ${event.versionNumber}`}
                      className={event.type === 'CREATED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                    />
                  </div>

                  <div>
                    <Link
                      to={`/records/${event.recordId}`}
                      className="text-lg font-medium text-white hover:text-blue-400 transition-colors flex items-center gap-2"
                    >
                      {event.title}
                    </Link>
                    <div className="text-sm text-slate-400 mt-1 flex items-center space-x-2">
                      <FileText className="h-3 w-3" />
                      <span>{event.fileName}</span>
                      <span className="text-slate-600">•</span>
                      <span>{titleCase(event.category)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-0 text-right">
                  <Badge
                    label={titleCase(event.blockchain.status)}
                    className={
                      event.blockchain.status === 'ANCHORED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }
                  />
                  {event.blockchain.onChainHash && (
                    <div className="text-[10px] text-slate-500 mt-2 font-mono">
                      {event.blockchain.onChainHash.substring(0, 16)}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
