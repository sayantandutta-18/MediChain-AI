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
import { apiClient, isApiOffline, toApiError } from '@/api/client';
import type { HealthStatus } from '@/types';

type Status = 'checking' | 'online' | 'offline';

interface ApiStatusValue {
  status: Status;
  health: HealthStatus | null;
  lastCheckedAt: Date | null;
  checkNow: () => Promise<void>;
  /** Called by any request that failed because the API was unreachable. */
  reportFailure: (error: unknown) => void;
}

const ApiStatusContext = createContext<ApiStatusValue | null>(null);

const PROBE_INTERVAL_MS = 20_000;
const INITIAL_DELAY_MS = 600;

export const ApiStatusProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<Status>('checking');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const statusRef = useRef<Status>('checking');

  const apply = useCallback((next: Status) => {
    if (statusRef.current !== next) {
      statusRef.current = next;
      setStatus(next);
    }
  }, []);

  const probe = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: HealthStatus }>('/health', { timeout: 6000 });
      setHealth(data.data);
      setLastCheckedAt(new Date());
      apply('online');
    } catch {
      apply('offline');
    }
  }, [apply]);

  useEffect(() => {
    const start = window.setTimeout(() => {
      void probe();
    }, INITIAL_DELAY_MS);

    const timer = window.setInterval(() => {
      void probe();
    }, PROBE_INTERVAL_MS);

    const onFocus = () => {
      if (statusRef.current === 'offline') void probe();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [probe]);

  const reportFailure = useCallback(
    (error: unknown) => {
      if (isApiOffline(toApiError(error))) apply('offline');
    },
    [apply],
  );

  const value = useMemo<ApiStatusValue>(
    () => ({ status, health, lastCheckedAt, checkNow: probe, reportFailure }),
    [status, health, lastCheckedAt, probe, reportFailure],
  );

  return <ApiStatusContext.Provider value={value}>{children}</ApiStatusContext.Provider>;
};

export const useApiStatus = (): ApiStatusValue => {
  const context = useContext(ApiStatusContext);
  if (!context) throw new Error('useApiStatus must be used inside <ApiStatusProvider>.');
  return context;
};
