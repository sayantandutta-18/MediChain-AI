import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, Filter, ScrollText, XCircle } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { auditApi } from '@/api/auditAi';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { formatDateTime, titleCase } from '@/utils/format';
import type { AuditEntry, Paginated } from '@/types';

const ACTION_TONE: Record<string, string> = {
  'record.upload': 'border-signal-400/30 bg-signal-400/10 text-signal-200',
  'record.download': 'border-azure-400/30 bg-azure-500/10 text-azure-400',
  'record.delete': 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  'record.verify': 'border-mint/30 bg-mint/10 text-mint',
  'access.approve': 'border-mint/30 bg-mint/10 text-mint',
  'access.reject': 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  'access.revoke': 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  'auth.login': 'border-white/10 bg-white/[0.06] text-slate-300',
  'auth.login_failed': 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

const actionTone = (action: string) =>
  ACTION_TONE[action] ?? 'border-white/10 bg-white/[0.06] text-slate-300';

export const AuditPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<Paginated<AuditEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | ''>('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await auditApi.list({ limit: 25, page, ...(result ? { result } : {}) }));
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, result]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [result]);

  return (
    <div>
      <SectionHeading
        eyebrow="TRD-10 · append-only"
        title="Audit trail"
        description="Every authentication, record and consent action on your account is recorded. Denied attempts are logged too."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {[
          { value: '', label: 'All events' },
          { value: 'SUCCESS', label: 'Successful' },
          { value: 'FAILURE', label: 'Denied / failed' },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setResult(item.value as typeof result)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              result === item.value
                ? 'border-signal-400/40 bg-signal-400/10 text-signal-200'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
            }`}
          >
            {item.label}
          </button>
        ))}
        {data ? (
          <span className="ml-auto text-xs text-slate-500">
            {data.pagination.total} event{data.pagination.total === 1 ? '' : 's'} recorded
          </span>
        ) : null}
      </div>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {isLoading && !data ? <SkeletonList count={4} /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="Actions you take inside MediChain-AI will be recorded here."
          icon={<ScrollText className="h-6 w-6" aria-hidden="true" />}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <ol className="divide-y divide-white/[0.06]">
            {data.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                    entry.result === 'SUCCESS'
                      ? 'border-mint/25 bg-mint/10 text-mint'
                      : 'border-rose-400/25 bg-rose-400/10 text-rose-300'
                  }`}
                >
                  {entry.result === 'SUCCESS' ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={titleCase(entry.action.split('.')[1] ?? entry.action)} className={actionTone(entry.action)} />
                    <span className="font-mono text-[11px] text-slate-600">{entry.action}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{formatDateTime(entry.createdAt)}</span>
                    {entry.resourceId ? (
                      <Link to={`/records/${entry.resourceId}`} className="link font-mono text-[11px]">
                        {entry.resourceId}
                      </Link>
                    ) : null}
                    {entry.reason ? <span className="font-mono text-[11px] text-rose-300/80">{entry.reason}</span> : null}
                    {entry.statusCode ? <span>HTTP {entry.statusCode}</span> : null}
                  </div>

                  {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-600">
                      {JSON.stringify(entry.metadata)}
                    </p>
                  ) : null}
                </div>

                <span className="shrink-0 text-[11px] capitalize text-slate-600">
                  {entry.actorRole ?? user?.role}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {data && data.pagination.pages > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="btn-ghost btn-sm"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {data.pagination.page} of {data.pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(data.pagination.pages, prev + 1))}
            disabled={page >= data.pagination.pages}
            className="btn-ghost btn-sm"
          >
            Next
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <Alert tone="info" title="Who can see this">
          Audit endpoints have their own authorization — you only ever see the trail of your own actions, never
          another user&apos;s.
        </Alert>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        Audit records are append-only and never deleted by the application.
      </p>
    </div>
  );
};
