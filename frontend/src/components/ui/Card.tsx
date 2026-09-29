import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const SectionHeading = ({ eyebrow, title, description, action }: SectionHeadingProps) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      {description ? <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export const Card = ({ children, className = '', hover = false, delay = 0 }: CardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`glass ${hover ? 'glass-hover' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  tone?: 'signal' | 'mint' | 'amber' | 'rose' | 'azure';
  delay?: number;
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  signal: 'text-signal-300 bg-signal-400/10 border-signal-400/20',
  mint: 'text-mint bg-mint/10 border-mint/20',
  amber: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  rose: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  azure: 'text-azure-400 bg-azure-500/10 border-azure-400/20',
};

export const StatCard = ({ label, value, icon, hint, tone = 'signal', delay = 0 }: StatCardProps) => (
  <Card hover delay={delay} className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${toneClasses[tone]}`}>
        {icon}
      </span>
    </div>
  </Card>
);
