import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ServerCrash, X } from 'lucide-react';
import { useState } from 'react';
import { useApiStatus } from '@/context/ApiStatusContext';

/**
 * Persistent, actionable banner shown whenever the browser cannot reach the API.
 * Without this the user just sees a raw "Bad gateway" from the dev proxy.
 */
export const ApiOfflineBanner = () => {
  const { status, health, checkNow } = useApiStatus();
  const [dismissed, setDismissed] = useState(false);

  if (status !== 'offline' || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="sticky top-0 z-50 border-b border-amber-400/30 bg-amber-500/12 backdrop-blur-xl"
        role="alert"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-amber-100">The backend is not running</p>
              <p className="mt-0.5 text-amber-200/80">
                Sign-in, uploads and access requests will fail until the API is up. From the project root run{' '}
                <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-amber-100">
                  npm run dev
                </code>{' '}
                and keep that terminal open.
              </p>
              {health === null ? null : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => void checkNow()} className="btn-ghost btn-sm">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="rounded-lg p-1.5 text-amber-200/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/** Inline variant for form pages, where a banner alone is not enough context. */
export const ApiOfflineNotice = ({ className = '' }: { className?: string }) => {
  const { status, checkNow } = useApiStatus();

  if (status !== 'offline') return null;

  return (
    <div
      className={`rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-6 text-center ${className}`}
      role="alert"
    >
      <AlertTriangle className="mx-auto h-7 w-7 text-amber-300" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-amber-100">Backend is not running</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-amber-200/85">
        The frontend is up, but it cannot reach the API on port 4000 — that is why registration returns
        &ldquo;Bad gateway&rdquo;.
      </p>
      <ol className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-sm text-amber-100/90">
        <li className="flex gap-2">
          <span className="text-amber-300">1.</span>
          <span>
            Open a terminal in the project root and run{' '}
            <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px]">npm run dev</code>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-300">2.</span>
          <span>
            Wait until you see <em>MediChain-AI API listening on port 4000</em>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-300">3.</span>
          <span>Keep that terminal open, then retry below</span>
        </li>
      </ol>
      <button type="button" onClick={() => void checkNow()} className="btn-primary mt-5">
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Check again
      </button>
    </div>
  );
};
