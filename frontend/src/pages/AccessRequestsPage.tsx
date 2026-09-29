import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Link2, Search, ShieldOff, UserPlus, X } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { accessRequestsApi } from '@/api/accessRequests';
import { authApi } from '@/api/auth';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, EmptyState, ErrorState, SkeletonList, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { statusStyles } from '@/utils/styles';
import { daysUntil, formatDate, formatDateTime, relativeTime } from '@/utils/format';
import type { AccessRequest, AccessRequestStatus, DoctorSummary } from '@/types';

const FILTERS: Array<{ value: AccessRequestStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REVOKED', label: 'Revoked' },
];

const DURATION_OPTIONS = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export const AccessRequestsPage = () => {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [filter, setFilter] = useState<AccessRequestStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSummary | null>(null);
  const [reason, setReason] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [decisionFor, setDecisionFor] = useState<AccessRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [durationDays, setDurationDays] = useState(7);
  const [decisionNote, setDecisionNote] = useState('');

  const [revokeFor, setRevokeFor] = useState<AccessRequest | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await accessRequestsApi.list({ limit: 50, ...(filter ? { status: filter } : {}) });
      setRequests(result.items);
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isRequestOpen) return;
    authApi
      .listDoctors(doctorSearch.trim() || undefined)
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, [isRequestOpen, doctorSearch]);

  const counts = useMemo(() => {
    const list = requests ?? [];
    return {
      pending: list.filter((item) => item.status === 'PENDING').length,
      approved: list.filter((item) => item.status === 'APPROVED' && !item.expired).length,
    };
  }, [requests]);

  const handleSubmitRequest = async () => {
    if (!selectedDoctor) {
      setActionError('Choose a doctor first.');
      return;
    }
    if (reason.trim().length < 10) {
      setActionError('Give a reason of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await accessRequestsApi.create({
        patientId: selectedDoctor.id,
        reason: reason.trim(),
        ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
      });
      setIsRequestOpen(false);
      setSelectedDoctor(null);
      setReason('');
      setPurpose('');
      void load();
    } catch (err) {
      setActionError(toError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecision = async () => {
    if (!decisionFor) return;
    setBusyId(decisionFor.id);
    setActionError(null);
    try {
      await accessRequestsApi.decide(decisionFor.id, {
        action: decisionAction,
        ...(decisionAction === 'APPROVE' ? { durationDays } : {}),
        ...(decisionNote.trim() ? { decisionNote: decisionNote.trim() } : {}),
      });
      setDecisionFor(null);
      setDecisionNote('');
      void load();
    } catch (err) {
      setActionError(toError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeFor) return;
    setBusyId(revokeFor.id);
    setActionError(null);
    try {
      await accessRequestsApi.revoke(revokeFor.id, revokeReason.trim() || undefined);
      setRevokeFor(null);
      setRevokeReason('');
      void load();
    } catch (err) {
      setActionError(toError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  return (
    <div>
      <SectionHeading
        eyebrow="Consent management"
        title={isPatient ? 'Access requests' : 'My access requests'}
        description={
          isPatient
            ? 'You decide who can read your records. Approvals are time bounded and can be revoked instantly.'
            : 'Request access to a patient. Until they approve, none of their records are visible to you.'
        }
        action={
          isPatient ? undefined : (
            <button type="button" onClick={() => setIsRequestOpen(true)} className="btn-primary">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Request access
            </button>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              filter === item.value
                ? 'border-signal-400/40 bg-signal-400/10 text-signal-200'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
            }`}
          >
            {item.label}
          </button>
        ))}
        {counts.pending > 0 ? (
          <span className="ml-auto text-xs text-amber-300">
            {counts.pending} request{counts.pending === 1 ? '' : 's'} awaiting your decision
          </span>
        ) : null}
      </div>

      {actionError ? (
        <div className="mb-5">
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {isLoading && !requests ? <SkeletonList count={3} /> : null}

      {requests && requests.length === 0 ? (
        <EmptyState
          title={filter ? 'No requests with this status' : 'No access requests yet'}
          description={
            isPatient
              ? 'When a doctor asks to view your records, the request will appear here with their reason.'
              : 'Request access to a patient to read their records under a revocable, time-bounded grant.'
          }
          icon={<Link2 className="h-6 w-6" aria-hidden="true" />}
          {...(!isPatient ? { actionLabel: 'Request access', onAction: () => setIsRequestOpen(true) } : {})}
        />
      ) : null}

      {requests && requests.length > 0 ? (
        <ul className="space-y-3">
          {requests.map((request, index) => {
            const style = statusStyles[request.status];
            const requestingDoctor = isPatient ? request.doctor : null;
            const otherName = isPatient ? request.doctor?.name : request.patient?.name;
            const remaining = daysUntil(request.expiresAt);
            const isExpired = request.expired || (remaining !== null && remaining < 0);

            return (
              <Card key={request.id} delay={index * 0.03} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{otherName ?? 'Unknown user'}</h3>
                      <Badge label={style.label} className={style.className} dot dotClassName={style.dot} />
                      {isExpired && request.status === 'APPROVED' ? (
                        <Badge label="Expired" className="border-slate-400/25 bg-slate-400/10 text-slate-300" />
                      ) : null}
                    </div>

                    {requestingDoctor ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {requestingDoctor.specialty ?? 'Doctor'}
                        {requestingDoctor.hospital ? ` · ${requestingDoctor.hospital}` : ''}
                        {requestingDoctor.registrationNumber ? ` · Reg ${requestingDoctor.registrationNumber}` : ''}
                      </p>
                    ) : null}

                    <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-sm leading-relaxed text-slate-300">
                      {request.reason}
                    </p>

                    {request.purpose ? (
                      <p className="mt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">Purpose:</span> {request.purpose}
                      </p>
                    ) : null}

                    {request.decisionNote ? (
                      <p className="mt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">Your note:</span> {request.decisionNote}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                      <span>Requested {relativeTime(request.requestedAt)}</span>
                      {request.expiresAt ? (
                        <span className={isExpired ? 'text-rose-300' : 'text-mint'}>
                          {isExpired
                            ? `Expired ${formatDate(request.expiresAt)}`
                            : `Expires ${formatDate(request.expiresAt)} (${remaining}d left)`}
                        </span>
                      ) : null}
                      {request.decidedAt ? <span>Decided {formatDateTime(request.decidedAt)}</span> : null}
                    </div>
                  </div>

                  {isPatient ? (
                    <div className="flex shrink-0 gap-2">
                      {request.status === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionFor(request);
                              setDecisionAction('APPROVE');
                            }}
                            className="btn-primary btn-sm"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionFor(request);
                              setDecisionAction('REJECT');
                            }}
                            className="btn-ghost btn-sm"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            Reject
                          </button>
                        </>
                      ) : null}

                      {request.status === 'APPROVED' && !isExpired ? (
                        <button
                          type="button"
                          onClick={() => setRevokeFor(request)}
                          className="btn-danger btn-sm"
                        >
                          <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="shrink-0">
                      <Badge
                        label={isExpired ? 'Access lapsed' : 'Access active'}
                        className={
                          isExpired
                            ? statusStyles.REVOKED.className
                            : statusStyles.APPROVED.className
                        }
                      />
                    </div>
                  )}
                </div>

                {busyId === request.id ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Spinner className="h-3.5 w-3.5" /> Updating…
                  </div>
                ) : null}
              </Card>
            );
          })}
        </ul>
      ) : null}

      {/* Doctor: request access */}
      <Modal
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title="Request access to a patient"
        description="The patient must approve before any of their records become visible to you."
        footer={
          <>
            <button type="button" onClick={() => setIsRequestOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitRequest}
              className="btn-primary"
              disabled={isSubmitting || !selectedDoctor}
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
              {isSubmitting ? 'Sending…' : 'Send request'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

          <div>
            <label htmlFor="doctor-search" className="field-label">
              Find a patient
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="doctor-search"
                type="search"
                value={doctorSearch}
                onChange={(event) => setDoctorSearch(event.target.value)}
                placeholder="Search by name or email…"
                className="field pl-10"
              />
            </div>
          </div>

          <div className="max-h-52 space-y-2 overflow-y-auto">
            {doctors.length === 0 ? (
              <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 text-center text-xs text-slate-500">
                No accounts found. Patients register from the sign-up page before you can request access.
              </p>
            ) : (
              doctors.map((doctor) => {
                const isSelected = selectedDoctor?.id === doctor.id;
                return (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-signal-400/50 bg-signal-400/10'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{doctor.name}</span>
                      <span className="block truncate text-xs text-slate-500">{doctor.email}</span>
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-signal-300" /> : null}
                  </button>
                );
              })
            )}
          </div>

          <div>
            <label htmlFor="request-reason" className="field-label">
              Clinical reason
            </label>
            <textarea
              id="request-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="field min-h-[90px] resize-y"
              placeholder="The patient asked me to review their latest lab results before their appointment."
              maxLength={1000}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              The patient sees this text before deciding. Minimum 10 characters.
            </p>
          </div>

          <div>
            <label htmlFor="request-purpose" className="field-label">
              Purpose <span className="normal-case text-slate-600">(optional)</span>
            </label>
            <input
              id="request-purpose"
              type="text"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="field"
              placeholder="Post-operative review"
              maxLength={500}
            />
          </div>
        </div>
      </Modal>

      {/* Patient: approve / reject */}
      <Modal
        isOpen={Boolean(decisionFor)}
        onClose={() => setDecisionFor(null)}
        title={decisionAction === 'APPROVE' ? 'Approve access request' : 'Reject access request'}
        description={
          decisionFor?.doctor
            ? `${decisionFor.doctor.name} will be able to read your records${decisionAction === 'APPROVE' ? ' until the grant expires' : ''}.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setDecisionFor(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDecision}
              className={decisionAction === 'APPROVE' ? 'btn-primary' : 'btn-danger'}
              disabled={busyId === decisionFor?.id}
            >
              {decisionAction === 'APPROVE' ? 'Approve access' : 'Reject request'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {decisionAction === 'APPROVE' ? (
            <div>
              <label htmlFor="duration" className="field-label">
                Access duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => setDurationDays(option.days)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      durationDays === option.days
                        ? 'border-signal-400/50 bg-signal-400/10 text-signal-200'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Access ends automatically on {formatDate(new Date(Date.now() + durationDays * 86_400_000).toISOString())}.
                You can revoke sooner at any time.
              </p>
            </div>
          ) : null}

          <div>
            <label htmlFor="decision-note" className="field-label">
              Note <span className="normal-case text-slate-600">(optional)</span>
            </label>
            <input
              id="decision-note"
              type="text"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              className="field"
              placeholder="Shared for the post-op review only"
              maxLength={1000}
            />
          </div>
        </div>
      </Modal>

      {/* Patient: revoke */}
      <Modal
        isOpen={Boolean(revokeFor)}
        onClose={() => setRevokeFor(null)}
        title="Revoke access"
        description="The doctor loses access to all of your records immediately."
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setRevokeFor(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              className="btn-danger"
              disabled={busyId === revokeFor?.id}
            >
              Revoke access
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="revoke-reason" className="field-label">
            Reason <span className="normal-case text-slate-600">(optional)</span>
          </label>
          <input
            id="revoke-reason"
            type="text"
            value={revokeReason}
            onChange={(event) => setRevokeReason(event.target.value)}
            className="field"
            placeholder="Course of treatment completed"
            maxLength={500}
          />
        </div>
      </Modal>
    </div>
  );
};
