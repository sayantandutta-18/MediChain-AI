import type { AccessRequestStatus, AnchorStatus, RecordCategory, VerificationStatus } from '@/types';

export const statusStyles: Record<
  AccessRequestStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    dot: 'bg-amber-400',
  },
  APPROVED: {
    label: 'Approved',
    className: 'border-mint/30 bg-mint/10 text-mint',
    dot: 'bg-mint',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    dot: 'bg-rose-400',
  },
  REVOKED: {
    label: 'Revoked',
    className: 'border-slate-400/25 bg-slate-400/10 text-slate-300',
    dot: 'bg-slate-400',
  },
};

export const anchorStyles: Record<AnchorStatus, { label: string; className: string }> = {
  ANCHORED: { label: 'Anchored on Sui', className: 'border-mint/30 bg-mint/10 text-mint' },
  SIMULATED: { label: 'Simulated anchor', className: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  PENDING: { label: 'Anchor pending', className: 'border-slate-400/25 bg-slate-400/10 text-slate-300' },
  FAILED: { label: 'Anchor failed', className: 'border-rose-400/30 bg-rose-400/10 text-rose-200' },
};

export const verificationStyles: Record<VerificationStatus, { label: string; className: string }> = {
  VERIFIED: { label: 'Verified', className: 'border-mint/30 bg-mint/10 text-mint' },
  MISMATCH: { label: 'Mismatch', className: 'border-rose-400/30 bg-rose-400/10 text-rose-200' },
  NOT_ANCHORED: { label: 'Not anchored', className: 'border-slate-400/25 bg-slate-400/10 text-slate-300' },
  UNAVAILABLE: { label: 'Chain unavailable', className: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
};

export const categoryStyles: Record<RecordCategory, { label: string; className: string }> = {
  'lab-report': { label: 'Lab report', className: 'border-signal-400/30 bg-signal-400/10 text-signal-200' },
  prescription: { label: 'Prescription', className: 'border-azure-400/30 bg-azure-500/10 text-azure-400' },
  imaging: { label: 'Imaging', className: 'border-violet-400/30 bg-violet-500/10 text-violet-200' },
  'discharge-summary': {
    label: 'Discharge summary',
    className: 'border-mint/30 bg-mint/10 text-mint',
  },
  vaccination: { label: 'Vaccination', className: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  other: { label: 'Other', className: 'border-white/10 bg-white/[0.06] text-slate-300' },
};

export const urgencyStyles: Record<string, { label: string; className: string }> = {
  routine: { label: 'Routine', className: 'border-mint/30 bg-mint/10 text-mint' },
  'discuss-soon': { label: 'Discuss soon', className: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  'prompt-attention': { label: 'Discuss promptly', className: 'border-rose-400/30 bg-rose-400/10 text-rose-200' },
};
