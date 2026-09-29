import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Logo = ({ to = '/' }: { to?: string }) => (
  <Link to={to} className="group flex items-center gap-2.5" aria-label="MediChain-AI home">
    <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-signal-400/30 bg-signal-400/10">
      <Activity className="h-4 w-4 text-signal-300" aria-hidden="true" />
      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-signal-400/20 transition group-hover:ring-signal-400/50" />
    </span>
    <span className="leading-tight">
      <span className="block text-sm font-bold tracking-tight text-white">MediChain-AI</span>
      <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Integrity layer</span>
    </span>
  </Link>
);
