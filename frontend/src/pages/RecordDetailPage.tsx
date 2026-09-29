import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileHeart,
  Fingerprint,
  Link2,
  Pencil,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { recordsApi } from '@/api/records';
import { aiApi } from '@/api/auditAi';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Badge, HashChip } from '@/components/ui/Badge';
import { Alert, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { anchorStyles, categoryStyles, urgencyStyles, verificationStyles } from '@/utils/styles';
import { formatBytes, formatDateTime, titleCase } from '@/utils/format';
import type { AiReport, MedicalRecord, RecordCategory, VerificationReport } from '@/types';
import { RECORD_CATEGORIES, RECORD_CATEGORY_LABELS } from '@/types';

export const RecordDetailPage = () => {
  const { recordId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [verification, setVerification] = useState<VerificationReport | null>(null);
  const [report, setReport] = useState<AiReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftCategory, setDraftCategory] = useState<RecordCategory>('other');
  const [question, setQuestion] = useState('');

  const isOwner = user?.role === 'patient';

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await recordsApi.get(recordId);
      setRecord(loaded);
      setDraftTitle(loaded.title);
      setDraftDescription(loaded.description ?? '');
      setDraftCategory(loaded.category);
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setActionError(null);
    try {
      setVerification(await recordsApi.verify(recordId));
    } catch (err) {
      setActionError(toError(err).message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setActionError(null);
    try {
      setReport(
        await aiApi.analyze({
          recordId,
          ...(question.trim() ? { question: question.trim() } : {}),
        }),
      );
    } catch (err) {
      setActionError(toError(err).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!record) return;
    setIsDownloading(true);
    setActionError(null);
    try {
      await recordsApi.download(record.recordId, record.fileName);
    } catch (err) {
      setActionError(toError(err).message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    setIsEditing(false);
    setActionError(null);
    try {
      setRecord(
        await recordsApi.update(recordId, {
          title: draftTitle.trim(),
          description: draftDescription.trim(),
          category: draftCategory,
        }),
      );
    } catch (err) {
      setActionError(toError(err).message);
    }
  };

  const handleDelete = async () => {
    setIsConfirmDelete(false);
    setActionError(null);
    try {
      await recordsApi.remove(recordId);
      navigate('/records', { replace: true });
    } catch (err) {
      setActionError(toError(err).message);
    }
  };

  if (isLoading) return <LoadingState label="Decrypting record metadata…" />;

  if (error || !record) {
    return (
      <div className="space-y-5">
        <Link to="/records" className="link inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to records
        </Link>
        <ErrorState
          title="Record unavailable"
          message={error ?? 'This record does not exist or you do not have access to it.'}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const anchor = anchorStyles[record.blockchain.status];

  return (
    <div>
      <Link to="/records" className="link mb-5 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to records
      </Link>

      <SectionHeading
        eyebrow={isOwner ? 'Your encrypted record' : 'Shared with you by consent'}
        title={record.title}
        description={record.description ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleDownload} disabled={isDownloading} className="btn-ghost">
              <Download className="h-4 w-4" aria-hidden="true" />
              {isDownloading ? 'Decrypting…' : 'Download'}
            </button>
            <Link to={`/verification?record=${record.recordId}`} className="btn-primary">
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Verify integrity
            </Link>
          </div>
        }
      />

      {actionError ? (
        <div className="mb-5">
          <Alert tone="danger" title="Action failed">
            {actionError}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Metadata */}
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title flex items-center gap-2">
                <FileHeart className="h-4 w-4 text-signal-300" aria-hidden="true" />
                Record details
              </h2>
              {isOwner && !isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)} className="btn-ghost btn-sm">
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Edit
                </button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-title" className="field-label">
                    Title
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="field"
                    maxLength={160}
                  />
                </div>
                <div>
                  <label htmlFor="edit-category" className="field-label">
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={draftCategory}
                    onChange={(event) => setDraftCategory(event.target.value as RecordCategory)}
                    className="field"
                  >
                    {RECORD_CATEGORIES.map((item) => (
                      <option key={item} value={item} className="bg-ink-900">
                        {RECORD_CATEGORY_LABELS[item]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-description" className="field-label">
                    Note
                  </label>
                  <textarea
                    id="edit-description"
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    className="field min-h-[90px] resize-y"
                    maxLength={2000}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSave} className="btn-primary">
                    Save changes
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Record id', value: <code className="font-mono text-xs text-signal-300">{record.recordId}</code> },
                  { label: 'Category', value: RECORD_CATEGORY_LABELS[record.category] },
                  { label: 'File name', value: record.fileName },
                  { label: 'File size', value: formatBytes(record.size) },
                  { label: 'MIME type', value: record.mimeType },
                  { label: 'Uploaded', value: formatDateTime(record.createdAt) },
                  ...(record.patient ? [{ label: 'Patient', value: record.patient.name }] : []),
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </dt>
                    <dd className="mt-1 truncate text-sm text-slate-200">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          {/* AI */}
          <Card className="p-6" delay={0.05}>
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-azure-400" aria-hidden="true" />
              AI-assisted understanding
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Explanations only. The AI never sees the document unless you ask, and it never diagnoses.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Optional: what do you want to understand?"
                aria-label="Question for the AI assistant"
                className="field flex-1"
                maxLength={500}
              />
              <button type="button" onClick={handleAnalyze} disabled={isAnalyzing} className="btn-primary">
                {isAnalyzing ? 'Analysing…' : 'Explain this record'}
              </button>
            </div>

            {report ? (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Summary</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{report.summary}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Key findings
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {report.keyFindings.map((finding) => (
                      <li key={finding} className="flex gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>

                {report.terminology.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Terminology
                    </p>
                    <dl className="mt-1.5 space-y-2">
                      {report.terminology.map((item) => (
                        <div key={item.term} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                          <dt className="text-sm font-semibold text-signal-200">{item.term}</dt>
                          <dd className="mt-0.5 text-xs text-slate-400">{item.explanation}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    In plain language
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {report.patientFriendlyExplanation}
                  </p>
                </div>

                {report.suggestedQuestions.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Questions to ask your doctor
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {report.suggestedQuestions.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-slate-300">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                  <Badge
                    label={urgencyStyles[report.urgency]?.label ?? report.urgency}
                    className={urgencyStyles[report.urgency]?.className ?? ''}
                  />
                  <span className="text-[11px] text-slate-600">
                    {report.model} · {formatDateTime(report.generatedAt)}
                  </span>
                </div>

                <Alert tone="warning">{report.disclaimer}</Alert>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6" delay={0.05}>
            <h2 className="section-title flex items-center gap-2">
              <Link2 className="h-4 w-4 text-mint" aria-hidden="true" />
              Integrity anchor
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">Status</span>
                <Badge label={anchor.label} className={anchor.className} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">Network</span>
                <span className="text-xs font-medium text-slate-300">{record.blockchain.network}</span>
              </div>
              {record.blockchain.anchoredAt ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Anchored at</span>
                  <span className="text-xs text-slate-300">{formatDateTime(record.blockchain.anchoredAt)}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Stored digest (MongoDB)
                </p>
                <code className="block break-all rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2 font-mono text-[11px] leading-relaxed text-signal-300">
                  {record.fileHash}
                </code>
              </div>
              {record.blockchain.onChainHash ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Anchored digest
                  </p>
                  <code className="block break-all rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2 font-mono text-[11px] leading-relaxed text-signal-300/80">
                    {record.blockchain.onChainHash}
                  </code>
                </div>
              ) : null}
              {record.blockchain.objectId ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <HashChip hash={record.blockchain.objectId} label="Object" />
                  {record.blockchain.transactionDigest ? (
                    <HashChip hash={record.blockchain.transactionDigest} label="Tx" />
                  ) : null}
                </div>
              ) : null}
            </div>

            <button type="button" onClick={handleVerify} disabled={isVerifying} className="btn-ghost mt-4 w-full">
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              {isVerifying ? 'Verifying…' : 'Run integrity check'}
            </button>

            {verification ? (
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  verification.status === 'VERIFIED'
                    ? 'border-mint/30 bg-mint/[0.07]'
                    : verification.status === 'MISMATCH'
                      ? 'border-rose-400/30 bg-rose-400/[0.07]'
                      : 'border-amber-400/30 bg-amber-400/[0.07]'
                }`}
              >
                <Badge
                  label={verificationStyles[verification.status].label}
                  className={verificationStyles[verification.status].className}
                />
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{verification.message}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Checked {formatDateTime(verification.checkedAt)}
                </p>
              </div>
            ) : null}
          </Card>

          {isOwner ? (
            <Card className="p-6" delay={0.1}>
              <h2 className="section-title">Danger zone</h2>
              <p className="mt-1 text-xs text-slate-500">
                Deleting removes the encrypted document from the database. The on-chain digest remains as a
                permanent integrity record.
              </p>
              <button type="button" onClick={() => setIsConfirmDelete(true)} className="btn-danger mt-4 w-full">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete this record
              </button>
            </Card>
          ) : (
            <Card className="p-6" delay={0.1}>
              <h2 className="section-title">Your access</h2>
              <p className="mt-1 text-xs text-slate-500">
                You are reading this under a patient-approved grant. You cannot edit or delete it.
              </p>
              <Badge
                label={titleCase(record.blockchain.status)}
                className={categoryStyles[record.category].className}
              />
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmDelete}
        title="Delete this record?"
        message={`"${record.title}" and its encrypted contents will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete permanently"
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsConfirmDelete(false)}
      />
    </div>
  );
};
