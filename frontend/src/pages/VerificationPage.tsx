import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Fingerprint, Link2, RefreshCw, ShieldQuestion, XCircle } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { recordsApi } from '@/api/records';
import { healthApi } from '@/api/auditAi';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { verificationStyles } from '@/utils/styles';
import { formatDateTime, shortHash } from '@/utils/format';
import type { HealthStatus, MedicalRecord, VerificationReport } from '@/types';

/**
 * PRD-5: verification retrieves the anchor, extracts the on-chain hash and
 * compares it with the digest stored in MongoDB.
 */
export const VerificationPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>(searchParams.get('record') ?? '');
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthStatus | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await recordsApi.list({ limit: 50 });
      setRecords(result.items);
      setSelectedId((current) => current || (result.items[0]?.recordId ?? ''));
    } catch (err) {
      setListError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await healthApi.check());
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
    void loadHealth();
  }, [loadRecords, loadHealth]);

  const runVerification = useCallback(async () => {
    if (!selectedId) return;
    setIsVerifying(true);
    setVerifyError(null);
    setReport(null);
    try {
      setReport(await recordsApi.verify(selectedId));
    } catch (err) {
      setVerifyError(toError(err).message);
    } finally {
      setIsVerifying(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) void runVerification();
  }, [selectedId, runVerification]);

  const selected = records.find((record) => record.recordId === selectedId);
  const chainConfigured = health?.dependencies.blockchain.configured ?? false;

  return (
    <div>
      <SectionHeading
        eyebrow="Independent integrity check"
        title="Blockchain verification"
        description="Compare the digest stored with your record against the digest anchored on the Sui network."
      />

      {health ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Network</p>
            <p className="mt-1.5 text-sm font-semibold text-white">{health.dependencies.blockchain.network}</p>
          </Card>
          <Card className="p-4" delay={0.05}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Move package</p>
            <p
              className={`mt-1.5 text-sm font-semibold ${
                chainConfigured ? 'text-mint' : 'text-amber-300'
              }`}
            >
              {chainConfigured ? 'Configured' : 'Not configured'}
            </p>
          </Card>
          <Card className="p-4" delay={0.1}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Node</p>
            <p
              className={`mt-1.5 text-sm font-semibold ${
                health.dependencies.blockchain.reachable ? 'text-mint' : 'text-rose-300'
              }`}
            >
              {health.dependencies.blockchain.reachable ? 'Reachable' : 'Unreachable'}
            </p>
          </Card>
        </div>
      ) : null}

      {!chainConfigured ? (
        <div className="mb-6">
          <Alert tone="warning" title="Running without a configured Sui package">
            Anchors are recorded as <span className="font-semibold">simulated</span> while{' '}
            <code className="font-mono text-xs">SUI_PACKAGE_ID</code> and{' '}
            <code className="font-mono text-xs">SUI_REGISTRY_ID</code> are unset. Verification still detects
            divergence between the stored digest and the digest captured at anchor time, but it cannot prove
            anything against live chain state.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <h2 className="section-title">Select a record</h2>
          {isLoading ? (
            <div className="mt-4">
              <SkeletonList count={3} />
            </div>
          ) : listError ? (
            <div className="mt-4">
              <ErrorState message={listError} onRetry={() => void loadRecords()} />
            </div>
          ) : records.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No records to verify"
                description={
                  user?.role === 'doctor'
                    ? 'Records appear here once a patient approves your access.'
                    : 'Upload a record first, then return here to verify its integrity.'
                }
                icon={<Fingerprint className="h-6 w-6" aria-hidden="true" />}
              />
            </div>
          ) : (
            <ul className="mt-4 max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
              {records.map((record) => {
                const isSelected = record.recordId === selectedId;
                return (
                  <li key={record.recordId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(record.recordId)}
                      className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                        isSelected
                          ? 'border-signal-400/50 bg-signal-400/10'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <span className="block truncate text-sm font-medium text-white">{record.title}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                        {shortHash(record.fileHash, 8)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title flex items-center gap-2">
              <Link2 className="h-4 w-4 text-mint" aria-hidden="true" />
              Verification result
            </h2>
            <button
              type="button"
              onClick={() => void runVerification()}
              disabled={!selectedId || isVerifying}
              className="btn-ghost btn-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? 'animate-spin' : ''}`} aria-hidden="true" />
              {isVerifying ? 'Verifying…' : 'Re-run'}
            </button>
          </div>

          {verifyError ? (
            <div className="mt-5">
              <ErrorState message={verifyError} onRetry={() => void runVerification()} />
            </div>
          ) : null}

          {!verifyError && !report ? (
            <div className="mt-5">
              <EmptyState
                title="Select a record to begin"
                description="Verification reads the anchored object back from the network and compares digests."
                icon={<ShieldQuestion className="h-6 w-6" aria-hidden="true" />}
              />
            </div>
          ) : null}

          {report ? (
            <div className="mt-5 space-y-4">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  report.status === 'VERIFIED'
                    ? 'border-mint/30 bg-mint/[0.07]'
                    : report.status === 'MISMATCH'
                      ? 'border-rose-400/30 bg-rose-400/[0.07]'
                      : 'border-amber-400/30 bg-amber-400/[0.07]'
                }`}
              >
                {report.status === 'MISMATCH' ? (
                  <XCircle className="h-6 w-6 shrink-0 text-rose-300" aria-hidden="true" />
                ) : (
                  <CheckCircle2
                    className={`h-6 w-6 shrink-0 ${report.status === 'VERIFIED' ? 'text-mint' : 'text-amber-300'}`}
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <Badge
                    label={verificationStyles[report.status].label}
                    className={verificationStyles[report.status].className}
                  />
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{report.message}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Digest in MongoDB
                  </p>
                  <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-signal-300">
                    {report.mongoHash}
                  </code>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Digest on chain
                  </p>
                  <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-signal-300/80">
                    {report.onChainHash ?? 'Not available'}
                  </code>
                </div>
              </div>

              <dl className="space-y-2 text-xs">
                {[
                  { label: 'Record', value: report.title ?? report.recordId },
                  { label: 'Network', value: report.network },
                  { label: 'Anchor object', value: report.objectId ?? '—' },
                  { label: 'Transaction', value: report.transactionDigest ?? '—' },
                  { label: 'Anchored at', value: formatDateTime(report.anchoredAt) },
                  { label: 'Checked at', value: formatDateTime(report.checkedAt) },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="truncate font-mono text-slate-300">{item.value}</dd>
                  </div>
                ))}
              </dl>

              {selected ? (
                <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-slate-500">
                  {selected.fileName} · {formatDateTime(selected.createdAt)}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
};
