interface BadgeProps {
  label: string;
  className?: string;
  dot?: boolean;
  dotClassName?: string;
}

/** Small status pill used for access requests, anchors and verification results. */
export const Badge = ({ label, className = '', dot = false, dotClassName = '' }: BadgeProps) => (
  <span className={`badge ${className}`}>
    {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} aria-hidden="true" /> : null}
    {label}
  </span>
);

export const HashChip = ({ hash, label }: { hash: string | null; label?: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/70 px-2 py-1">
    {label ? <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span> : null}
    <code className="font-mono text-[11px] text-signal-300" title={hash ?? undefined}>
      {hash ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : '—'}
    </code>
  </span>
);
