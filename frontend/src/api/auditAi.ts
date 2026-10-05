import { apiClient } from './client';
import type { AiReport, AuditEntry, HealthStatus, Paginated } from '@/types';

interface Envelope<T> {
  data: T;
}

export const auditApi = {
  list: async (params: { action?: string; result?: 'SUCCESS' | 'FAILURE'; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<Envelope<Paginated<AuditEntry>>>('/audit-logs', { params });
    return data.data;
  },
};

export const aiApi = {
  generateTimeline: async () => {
    const { data } = await apiClient.get<Envelope<any>>('/ai/timeline');
    return data.data;
  },
  analyze: async (payload: { recordId: string; question?: string; language?: 'en' | 'simple-en' }) => {
    const { data } = await apiClient.post<Envelope<{ report: AiReport }>>('/ai/analyze', payload);
    return data.data.report;
  },

  status: async (): Promise<{ configured: boolean; model: string }> => {
    const { data } = await apiClient.get<Envelope<{ ai: { configured: boolean; model: string } }>>('/ai/status');
    return data.data.ai;
  },
};

export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    const { data } = await apiClient.get<Envelope<HealthStatus>>('/health');
    return data.data;
  },
};
