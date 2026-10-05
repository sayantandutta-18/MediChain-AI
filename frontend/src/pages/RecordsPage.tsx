import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileHeart, Link2, Search, UploadCloud } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { recordsApi } from '@/api/records';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { UploadRecordModal } from '@/components/records/UploadRecordModal';
import { anchorStyles, categoryStyles } from '@/utils/styles';
import { formatBytes, formatDate, shortHash } from '@/utils/format';
import {
  RECORD_CATEGORIES,
  RECORD_CATEGORY_LABELS,
  type MedicalRecord,
  type Paginated,
  type RecordCategory,
} from '@/types';

export const RecordsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<Paginated<MedicalRecord> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RecordCategory | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(searchParams.get('upload') === '1');

  const isPatient = user?.role === 'patient';

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(
        await recordsApi.list({
          page,
          limit: 12,
          ...(category ? { category } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        }),
      );
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, category, search, startDate, endDate, verificationStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounce the search so every keystroke does not hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 300);
    return () => window.clearTimeout(timer);
  }, [search, category, startDate, endDate, verificationStatus]);

  const closeUpload = () => {
    setIsUploadOpen(false);
    if (searchParams.get('upload')) {
      searchParams.delete('upload');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const totals = useMemo(() => {
    const bytes = data?.items.reduce((sum, record) => sum + record.size, 0) ?? 0;
    return { bytes, shown: data?.items.length ?? 0 };
  }, [data]);

  return (
    <div>
      <SectionHeading
        eyebrow="Encrypted storage"
        title="Medical records"
        description={
          isPatient
            ? 'Every file is hashed, encrypted and integrity-anchored. Only you and approved doctors can read them.'
            : 'Records listed here are covered by an approved, unexpired access grant from the patient.'
        }
        action={
          isPatient ? (
            <button type="button" onClick={() => setIsUploadOpen(true)} className="btn-primary">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Upload record
            </button>
          ) : undefined
        }
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, note or file name…"
              aria-label="Search records"
              className="field pl-10"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as RecordCategory | '')}
            aria-label="Filter by category"
            className="field sm:w-52"
          >
            <option value="" className="bg-ink-900">
              All categories
            </option>
            {RECORD_CATEGORIES.map((item) => (
              <option key={item} value={item} className="bg-ink-900">
                {RECORD_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-3 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-12">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field flex-1 sm:w-auto text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-12">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field flex-1 sm:w-auto text-sm"
            />
          </div>
          <select
            value={verificationStatus}
            onChange={(e) => setVerificationStatus(e.target.value)}
            aria-label="Filter by verification"
            className="field flex-1 sm:w-auto text-sm"
          >
            <option value="" className="bg-ink-900">All Statuses</option>
            <option value="ANCHORED" className="bg-ink-900">Anchored</option>
            <option value="SIMULATED" className="bg-ink-900">Simulated</option>
            <option value="PENDING" className="bg-ink-900">Pending</option>
            <option value="FAILED" className="bg-ink-900">Failed</option>
          </select>
        </div>
      </Card>

      {error ? (
        <div className="mb-5">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {isLoading && !data ? <SkeletonList count={3} /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title={search || category ? 'No records match your filters' : 'No records yet'}
          description={
            search || category
              ? 'Try a different search term or clear the category filter.'
              : isPatient
                ? 'Upload your first medical document to create an encrypted record with an anchored digest.'
                : 'Once a patient approves your access request, their records will appear here.'
          }
          icon={<FileHeart className="h-6 w-6" aria-hidden="true" />}
          {...(isPatient && !search && !category
            ? { actionLabel: 'Upload a record', onAction: () => setIsUploadOpen(true) }
            : {})}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((record, index) => {
              const anchor = anchorStyles[record.blockchain.status];
              const categoryStyle = categoryStyles[record.category];
              return (
                <Card key={record.recordId} hover delay={index * 0.03} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <FileHeart className="h-5 w-5 text-signal-300" aria-hidden="true" />
                    </span>
                    <Badge label={categoryStyle.label} className={categoryStyle.className} />
                  </div>

                  <Link to={`/records/${record.recordId}`} className="mt-4 block">
                    <h2 className="truncate text-base font-semibold text-white transition hover:text-signal-200">
                      {record.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {record.description || record.fileName}
                    </p>
                  </Link>

                  <dl className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">File</dt>
                      <dd className="truncate text-slate-400">
                        {record.fileName} · {formatBytes(record.size)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Uploaded</dt>
                      <dd className="text-slate-400">{formatDate(record.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">SHA-256</dt>
                      <dd className="font-mono text-signal-300/80">{shortHash(record.fileHash)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
                    <Badge label={anchor.label} className={anchor.className} />
                    <Link to={`/records/${record.recordId}`} className="link text-xs font-semibold">
                      Open
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-slate-500">
              Showing {totals.shown} of {data.pagination.total} records · {formatBytes(totals.bytes)} on this page
            </p>
            {data.pagination.pages > 1 ? (
              <div className="flex items-center gap-2">
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
          </div>
        </>
      ) : null}

      {!isPatient && data && data.items.length > 0 ? (
        <div className="mt-6">
          <Alert tone="info" title="Read-only by policy">
            You can view and download these records, but you cannot edit or delete a patient&apos;s record.
          </Alert>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Digests are anchored on {data.items[0]?.blockchain.network ?? 'testnet'}
        </p>
      ) : null}

      {isPatient ? (
        <UploadRecordModal
          isOpen={isUploadOpen}
          onClose={closeUpload}
          onUploaded={() => {
            void load();
          }}
        />
      ) : null}
    </div>
  );
};
