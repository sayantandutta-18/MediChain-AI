import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { severityStyles, useNotifications } from '@/context/NotificationContext';
import { relativeTime } from '@/utils/format';

/**
 * Feature 02 — notification bell.
 *
 * Unread count comes from the real backend summary endpoint; there is no local
 * guesswork, so the badge is correct across devices.
 */
export const NotificationBell = () => {
  const { notifications, unreadCount, isLoading, refresh, markRead, markAllRead, dismiss } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const onClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [isOpen]);

  const openNotification = async (id: string, link: string | null) => {
    await markRead(id);
    setIsOpen(false);
    if (link) navigate(link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) void refresh();
        }}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        className="relative rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:border-signal-400/40 hover:text-white"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="glass absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Notifications</h2>
              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <CheckCheck className="h-3 w-3" aria-hidden="true" />
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <BellOff className="h-6 w-6 text-slate-600" aria-hidden="true" />
                  <p className="text-sm text-slate-400">You&apos;re all caught up</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {notifications.map((item) => (
                    <li key={item.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => void openNotification(item.id, item.link)}
                        className={`w-full px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                          item.read ? 'opacity-60' : ''
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              item.read ? 'bg-transparent' : 'bg-signal-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-white">{item.title}</span>
                            {item.body ? (
                              <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{item.body}</span>
                            ) : null}
                            <span className="mt-1 flex items-center gap-2">
                              <Badge severity={item.severity} />
                              <span className="text-[10px] text-slate-500">{relativeTime(item.createdAt)}</span>
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void dismiss(item.id)}
                        aria-label={`Dismiss ${item.title}`}
                        className="absolute right-2 top-2 rounded-lg p-1 text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-white focus:opacity-100 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const Badge = ({ severity }: { severity: keyof typeof severityStyles }) => (
  <span className={`badge ${severityStyles[severity]}`}>{severity}</span>
);