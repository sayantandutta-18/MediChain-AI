import { AlertTriangle, CheckCircle2, Inbox, Loader2, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <Loader2 className={`${className} animate-spin text-signal-400`} aria-hidden="true" />
);

export const LoadingState = ({ label = 'Loading…', className = '' }: { label?: string; className?: string }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`} role="status">
    <Spinner className="h-7 w-7" />
    <p className="text-sm text-slate-400">{label}</p>
  </div>
);

export const SkeletonCard = () => (
  <div className="glass space-y-3 p-5">
    <div className="skeleton h-4 w-1/3" />
    <div className="skeleton h-6 w-2/3" />
    <div className="skeleton h-3 w-1/2" />
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  title,
  description,
  icon,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) => (
  <div className="glass flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
      {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
    </span>
    <h3 className="text-base font-semibold text-white">{title}</h3>
    {description ? <p className="max-w-md text-sm text-slate-400">{description}</p> : null}
    {actionLabel && actionTo ? (
      <Link to={actionTo} className="btn-primary mt-2">
        {actionLabel}
      </Link>
    ) : null}
    {actionLabel && !actionTo && onAction ? (
      <button type="button" onClick={onAction} className="btn-primary mt-2">
        {actionLabel}
      </button>
    ) : null}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[0.07] px-6 py-12 text-center"
  >
    <ShieldAlert className="h-7 w-7 text-rose-300" aria-hidden="true" />
    <h3 className="text-base font-semibold text-rose-100">{title}</h3>
    <p className="max-w-md text-sm text-rose-200/80">{message}</p>
    {onRetry ? (
      <button type="button" onClick={onRetry} className="btn-ghost mt-1">
        Try again
      </button>
    ) : null}
  </div>
);

interface AlertProps {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
}

const alertTones = {
  info: 'border-signal-400/25 bg-signal-400/[0.07] text-signal-100',
  warning: 'border-amber-400/30 bg-amber-400/[0.07] text-amber-100',
  danger: 'border-rose-400/30 bg-rose-400/[0.07] text-rose-100',
  success: 'border-mint/30 bg-mint/[0.07] text-mint',
} as const;

const alertIcons = {
  info: AlertTriangle,
  warning: AlertTriangle,
  danger: AlertTriangle,
  success: CheckCircle2,
} as const;

export const Alert = ({ tone = 'info', title, children }: AlertProps) => {
  const Icon = alertIcons[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${alertTones[tone]}`} role="status">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5 opacity-90' : 'opacity-90'}>{children}</div>
      </div>
    </div>
  );
};
