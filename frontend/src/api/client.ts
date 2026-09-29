import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorPayload } from './errors';

const TOKEN_STORAGE_KEY = 'medichain.token';
const USER_STORAGE_KEY = 'medichain.user';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      /* storage unavailable (private mode) - the session simply won't persist */
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* noop */
    }
  },
};

export const userStorage = {
  get<T>(): T | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set<T>(value: T): void {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* noop */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* noop */
    }
  },
};

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

/**
 * TRD-13: one centralised axios instance. Auth header, response unwrapping and
 * error normalisation all live here so components never touch axios directly.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};

export const setUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
  onUnauthorized = handler;
};

/** Actionable guidance shown whenever the browser cannot reach the API at all. */
export const API_OFFLINE_MESSAGE =
  'Cannot reach the MediChain-AI API. Start the backend with "npm run dev" from the project root ' +
  '(it must be listening on port 4000), then try again.';

export const toApiError = (error: unknown): ApiErrorPayload => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: ApiErrorPayload }>;

    // The dev/preview proxy answers 502/503/504 when the API process is down.
    if (axiosError.response && [502, 503, 504].includes(axiosError.response.status)) {
      return { code: 'API_UNREACHABLE', message: API_OFFLINE_MESSAGE };
    }

    if (axiosError.response) {
      const payload = axiosError.response.data?.error;
      if (payload) return payload;
      return {
        code: `HTTP_${axiosError.response.status}`,
        message: axiosError.response.statusText || 'Request failed.',
      };
    }

    if (axiosError.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: 'The server took too long to respond. Please try again.' };
    }

    // No response at all: connection refused / DNS / CORS-blocked.
    return { code: 'API_UNREACHABLE', message: API_OFFLINE_MESSAGE };
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', message: error.message };
  }

  return { code: 'UNKNOWN_ERROR', message: 'Something went wrong.' };
};

export const isApiOffline = (error: ApiErrorPayload): boolean => error.code === 'API_UNREACHABLE';

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const code = (error.response.data as { error?: { code?: string } } | undefined)?.error?.code;
      // A failed session bootstrap should not spam the login screen.
      if (code !== 'TOKEN_MISSING') {
        tokenStorage.clear();
        userStorage.clear();
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
