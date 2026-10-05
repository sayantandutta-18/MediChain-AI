import { useEffect, useState } from 'react';
import { ShieldAlert, Users, Link as LinkIcon, Power, CheckCircle, Download } from 'lucide-react';
import { apiClient } from '@/api/client';

import { formatDateTime } from '@/utils/format';
import { LoadingState } from '@/components/ui/Feedback';

interface PrivacyMetrics {
  activeGrants: number;
  activeShareLinks: number;
  recentPrivacyEvents: any[];
  unauthorizedAttempts: number;
}

export const PrivacyDashboardPage = () => {
  const [metrics, setMetrics] = useState<PrivacyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data } = await apiClient.get('/security/privacy-dashboard');
      setMetrics(data.data);
    } catch (err) {
      console.error('Failed to load privacy metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data } = await apiClient.get('/auth/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'medichain-export.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('WARNING: This will instantly revoke ALL doctor access and disable ALL share links. Are you sure?')) {
      return;
    }
    
    setIsRevoking(true);
    try {
      await apiClient.post('/security/privacy-dashboard/revoke-all');
      setRevoked(true);
      await fetchMetrics();
    } catch (err) {
      console.error('Failed to revoke access', err);
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading || !metrics) {
    return <LoadingState label="Loading privacy dashboard..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Privacy Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage your active sharing footprint and data exposure.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button onClick={handleExport} disabled={isExporting} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
          {revoked ? (
            <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">All access secured</span>
            </div>
          ) : (
            <button 
              onClick={handleRevokeAll} 
              disabled={isRevoking || (metrics.activeGrants === 0 && metrics.activeShareLinks === 0)}
              className="btn-danger flex items-center gap-2"
            >
              <Power className="h-4 w-4" />
              {isRevoking ? 'Revoking...' : 'Revoke All Access (Kill Switch)'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-400">Active Doctor Grants</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.activeGrants}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <LinkIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-400">Active Share Links</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.activeShareLinks}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${metrics.unauthorizedAttempts > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-400">Unauthorized Attempts (30d)</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.unauthorizedAttempts}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-lg font-medium text-white">Recent Privacy Events</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {metrics.recentPrivacyEvents.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No recent privacy events.</div>
          ) : (
            metrics.recentPrivacyEvents.map((event, idx) => (
              <div key={idx} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/20">
                <div>
                  <div className="font-medium text-white">{event.type.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-slate-400 mt-1 flex items-center space-x-4">
                    <span>IP: {event.ipAddress}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500 mt-2 sm:mt-0 whitespace-nowrap">
                  {formatDateTime(event.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
