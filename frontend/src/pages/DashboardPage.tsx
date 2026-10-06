import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Building2, Database, Clock, Pill,
  ArrowUpRight,
  FileHeart,
  Fingerprint,
  Hourglass,
  Link2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth, toError } from '@/context/AuthContext';
import { recordsApi } from '@/api/records';
import { accessRequestsApi } from '@/api/accessRequests';
import { aiApi } from '@/api/auditAi';
import { Badge } from '@/components/ui/Badge';
import { Card, SectionHeading, StatCard } from '@/components/ui/Card';
import { Alert, EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { anchorStyles, statusStyles } from '@/utils/styles';

import { formatDate, relativeTime, shortHash } from '@/utils/format';
import type { AccessRequest, AccessStats, MedicalRecord, RecordStats } from '@/types';

interface DashboardData {
  stats: RecordStats;
  access: AccessStats;
  recentRecords: MedicalRecord[];
  recentRequests: AccessRequest[];
  aiConfigured: boolean;
}

export const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stats, access, records, requests, ai] = await Promise.all([
        recordsApi.stats(),
        accessRequestsApi.stats(),
        recordsApi.list({ limit: 5 }),
        accessRequestsApi.list({ limit: 5 }),
        aiApi.status(),
      ]);
      setData({
        stats,
        access,
        recentRecords: records.items,
        recentRequests: requests.items,
        aiConfigured: ai.configured,
      });
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const isPatient = user.role === 'patient';
  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <div>
      <SectionHeading
        eyebrow={isPatient ? 'Patient workspace' : 'Clinician workspace'}
        title={`Welcome back, ${firstName}`}
        description={
          isPatient
            ? 'Your records are encrypted at rest and anchored for integrity. You decide who sees them.'
            : 'You can only read records covered by an approved, unexpired access grant from a patient.'
        }
        action={
          <Link to={isPatient ? '/records?upload=1' : '/access-requests'} className="btn-primary">
            {isPatient ? 'Upload a record' : 'Request access'}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      {error ? (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {!data && isLoading ? <SkeletonList count={3} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={isPatient ? 'My records' : 'Accessible records'}
              value={data.stats.total}
              icon={<FileHeart className="h-5 w-5" aria-hidden="true" />}
              hint={`${data.stats.anchored} anchored on chain`}
              delay={0}
            />
            <StatCard
              label="Integrity anchored"
              value={data.stats.anchored}
              icon={<Link2 className="h-5 w-5" aria-hidden="true" />}
              hint={data.stats.unanchored > 0 ? `${data.stats.unanchored} pending` : 'All digests anchored'}
              tone="mint"
              delay={0.05}
            />
            <StatCard
              label={isPatient ? 'Pending requests' : 'Active grants'}
              value={isPatient ? data.access.pending : data.access.approved}
              icon={<Users className="h-5 w-5" aria-hidden="true" />}
              hint={
                isPatient
                  ? `${data.access.approved} doctor${data.access.approved === 1 ? '' : 's'} with access`
                  : `${data.access.accessiblePatients} patient${data.access.accessiblePatients === 1 ? '' : 's'}`
              }
              tone="amber"
              delay={0.1}
            />
            <StatCard
              label="AI assistant"
              value={data.aiConfigured ? 'Ready' : 'Offline'}
              icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
              hint={data.aiConfigured ? 'Report explanations enabled' : 'No provider key configured'}
              tone={data.aiConfigured ? 'azure' : 'rose'}
              delay={0.15}
            />
          </div>

          {!data.aiConfigured ? (
            <Alert tone="info" title="AI assistant is not configured">
              The server has no AI provider key, so report explanations return a controlled error instead of
              failing. Everything else works normally.
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Records */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="section-title">Recent records</h2>
                <Link to="/records" className="link text-xs font-semibold">
                  View all
                </Link>
              </div>

              {data.recentRecords.length === 0 ? (
                <EmptyState
                  title="No records yet"
                  description={
                    isPatient
                      ? 'Upload your first medical document to create an encrypted, integrity-anchored record.'
                      : 'Records appear here once a patient approves your access request.'
                  }
                  icon={<FileHeart className="h-6 w-6" aria-hidden="true" />}
                  {...(isPatient ? { actionLabel: 'Upload a record', actionTo: '/records?upload=1' } : {})}
                />
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {data.recentRecords.map((record) => (
                    <li key={record.recordId}>
                      <Link
                        to={`/records/${record.recordId}`}
                        className="flex items-center gap-3 py-3 transition hover:bg-white/[0.03]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                          <FileHeart className="h-4 w-4 text-signal-300" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">{record.title}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {record.fileName} · {relativeTime(record.createdAt)}
                          </span>
                        </span>
                        <Badge
                          label={anchorStyles[record.blockchain.status].label}
                          className={anchorStyles[record.blockchain.status].className}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Access */}
            <Card className="p-6" delay={0.05}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="section-title">
                  {isPatient ? 'Access requests' : 'My requests'}
                </h2>
                <Link to="/access-requests" className="link text-xs font-semibold">
                  Manage
                </Link>
              </div>

              {data.recentRequests.length === 0 ? (
                <EmptyState
                  title="Nothing pending"
                  description={
                    isPatient
                      ? 'Doctor access requests will appear here for you to approve or reject.'
                      : 'Request access to a patient to see their records here.'
                  }
                  icon={<Hourglass className="h-6 w-6" aria-hidden="true" />}
                />
              ) : (
                <ul className="space-y-3">
                  {data.recentRequests.map((request) => {
                    const style = statusStyles[request.status];
                    const other = isPatient ? request.doctor : request.patient;
                    return (
                      <li key={request.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-white">
                            {other?.name ?? 'Unknown'}
                          </p>
                          <Badge label={style.label} className={style.className} dot dotClassName={style.dot} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{request.reason}</p>
                        {request.expiresAt && request.status === 'APPROVED' ? (
                          <p className="mt-1.5 text-[11px] text-slate-500">
                            Expires {formatDate(request.expiresAt)}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Security posture */}
          <Card className="p-6" delay={0.1}>
            <h2 className="section-title">Security posture</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Encrypted at rest',
                  body: 'Every file is sealed with AES-256-GCM before it reaches the database.',
                  active: true,
                },
                {
                  icon: Fingerprint,
                  title: 'Integrity anchored',
                  body: `${data.stats.anchored} of ${data.stats.total} records have a digest anchored on Sui.`,
                  active: data.stats.total === 0 || data.stats.unanchored === 0,
                },
                {
                  icon: Activity,
                  title: 'Consent enforced',
                  body:
                    isPatient
                      ? `${data.access.approved} active grant${data.access.approved === 1 ? '' : 's'} · ${data.access.pending} awaiting your decision.`
                      : `${data.access.accessiblePatients} patient${data.access.accessiblePatients === 1 ? '' : 's'} currently grant you access.`,
                  active: true,
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                      item.active
                        ? 'border-mint/25 bg-mint/10 text-mint'
                        : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                    }`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {data.recentRecords.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass overflow-hidden p-6"
            >
              <h2 className="section-title">Latest anchored digest</h2>
              <p className="mt-1 text-xs text-slate-500">
                The digest below is what the Sui anchor stores — never the document itself.
              </p>
              <code className="mt-3 block overflow-x-auto rounded-xl border border-white/10 bg-ink-950/70 px-4 py-3 font-mono text-xs text-signal-300">
                {shortHash(data.recentRecords[0]?.fileHash ?? null, 20)}
              </code>
            </motion.div>
          ) : null}
        </div>
      ) : null}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-8">
          <Link to="/hospitals">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Building2 className="h-8 w-8 text-blue-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Hospitals</h3>
              <p className="text-sm text-slate-400 mt-1">Provider directory</p>
            </Card>
          </Link>
          <Link to="/explorer">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Database className="h-8 w-8 text-indigo-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Sui Explorer</h3>
              <p className="text-sm text-slate-400 mt-1">Blockchain anchors</p>
            </Card>
          </Link>
          <Link to="/prescriptions">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Pill className="h-8 w-8 text-rose-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Medications</h3>
              <p className="text-sm text-slate-400 mt-1">Active prescriptions</p>
            </Card>
          </Link>
          <Link to="/appointments">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Clock className="h-8 w-8 text-emerald-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Appointments</h3>
              <p className="text-sm text-slate-400 mt-1">Schedule & visits</p>
            </Card>
          </Link>
        </div>
    </div>
  );
};
