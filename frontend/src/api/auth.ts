import { apiClient } from './client';
import type { AuthSession, DoctorSummary, User } from '@/types';

export interface Envelope<T> { data: T; }

export interface MfaSetupResponse {
  qrCodeUrl: string;
  secret: string;
}

interface SessionResponse {
  data: AuthSession;
}

export const authApi = {
  setupMfa: async () => {
    const { data } = await apiClient.post<Envelope<MfaSetupResponse>>('/auth/mfa/setup');
    return data.data;
  },
  verifyMfa: async (code: string) => {
    await apiClient.post('/auth/mfa/verify', { code });
  },
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role: 'patient' | 'doctor';
    specialty?: string;
    hospital?: string;
    registrationNumber?: string;
  }): Promise<AuthSession> => {
    const { data } = await apiClient.post<SessionResponse>('/auth/register', payload);
    return data.data;
  },

  login: async (email: string, password: string, totpCode?: string): Promise<AuthSession> => {
    const { data } = await apiClient.post<SessionResponse>('/auth/login', { email, password, totpCode });
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<{ data: { user: User } }>('/auth/me');
    return data.data.user;
  },

  updateProfile: async (payload: {
    name?: string;
    specialty?: string;
    hospital?: string;
    registrationNumber?: string;
  }): Promise<User> => {
    const { data } = await apiClient.patch<{ data: { user: User } }>('/auth/me', payload);
    return data.data.user;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<AuthSession> => {
    const { data } = await apiClient.post<SessionResponse>('/auth/me/password', {
      currentPassword,
      newPassword,
    });
    return data.data;
  },

  listDoctors: async (search?: string): Promise<DoctorSummary[]> => {
    const { data } = await apiClient.get<{ data: { doctors: DoctorSummary[] } }>('/auth/doctors', {
      params: search ? { search } : undefined,
    });
    return data.data.doctors;
  },
};
