import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  notificationsApi,
  type AppNotification,
  type NotificationSeverity,
} from '@/api/notifications';
import { toApiError } from '@/api/client';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;

/**
 * Feature 02 — client-side notification center.
 *
 * All data comes from the real backend. Polling is used instead of a socket so
 * the same code works behind proxies without extra configuration.
 */
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [list, summary] = await Promise.all([
        notificationsApi.list({ limit: 30 }),
        notificationsApi.summary(),
      ]);
      if (!mounted.current) return;
      setNotifications(list.items);
      setUnreadCount(summary.unread);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      // A failed poll must never break the page; the badge simply stops updating.
      setError(toApiError(err).message);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    setIsLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic: the user already sees the effect they asked for.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationsApi.markRead(id);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      setNotifications(previous);
      await refresh();
    }
  }, [notifications, refresh]);

  const dismiss = useCallback(
    async (id: string) => {
      const previous = notifications;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      try {
        await notificationsApi.remove(id);
      } catch {
        setNotifications(previous);
        await refresh();
      }
    },
    [notifications, refresh],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, isLoading, error, refresh, markRead, markAllRead, dismiss }),
    [notifications, unreadCount, isLoading, error, refresh, markRead, markAllRead, dismiss],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationProvider>.');
  return context;
};

export const severityStyles: Record<NotificationSeverity, string> = {
  info: 'border-signal-400/30 bg-signal-400/10 text-signal-200',
  success: 'border-mint/30 bg-mint/10 text-mint',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  critical: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};