import { useEffect, useState } from 'react';
import { BarChart3, Activity, FileText } from 'lucide-react';
import { apiClient } from '@/api/client';
import { LoadingState } from '@/components/ui/Feedback';

interface StatsResponse {
  total: number;
  anchored: number;
  unanchored: number;
  categories: { category: string; count: number }[];
  uploadsByMonth: { label: string; count: number }[];
}

export const AnalyticsPage = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await apiClient.get('/records/stats');
      setStats(data.data.stats);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return <LoadingState label="Loading analytics..." />;
  }

  const getCategoryColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    return colors[index % colors.length];
  };

  const maxUploads = stats.uploadsByMonth.length 
    ? Math.max(...stats.uploadsByMonth.map(m => m.count)) 
    : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-emerald-400" />
          Health Analytics
        </h1>
        <p className="text-slate-400 mt-1">Overview of your medical record distribution and upload activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="text-sm font-medium text-slate-400">Total Records</div>
          <div className="text-3xl font-bold text-white mt-2">{stats.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="text-sm font-medium text-slate-400">Blockchain Anchored</div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{stats.anchored}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="text-sm font-medium text-slate-400">Pending / Unanchored</div>
          <div className="text-3xl font-bold text-amber-400 mt-2">{stats.unanchored}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Records by Category
          </h2>
          {stats.categories.length === 0 ? (
            <p className="text-slate-500">No records found.</p>
          ) : (
            <div className="space-y-4">
              {stats.categories.map((cat, idx) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">{cat.category.replace(/-/g, ' ')}</span>
                    <span className="text-slate-400">{cat.count}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getCategoryColor(idx)}`} 
                      style={{ width: `${Math.max((cat.count / stats.total) * 100, 2)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            Upload Activity
          </h2>
          {stats.uploadsByMonth.length === 0 ? (
            <p className="text-slate-500">No upload history.</p>
          ) : (
            <div className="flex items-end h-48 space-x-2">
              {stats.uploadsByMonth.map((month) => {
                const height = maxUploads > 0 ? (month.count / maxUploads) * 100 : 0;
                return (
                  <div key={month.label} className="flex-1 flex flex-col items-center group">
                    <div className="w-full bg-slate-800 rounded-t-sm relative h-full flex items-end">
                      <div 
                        className="w-full bg-indigo-500/80 rounded-t-sm transition-all group-hover:bg-indigo-400"
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 truncate w-full text-center">
                      {month.label.split('-')[1]}/{month.label.split('-')[0].slice(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
