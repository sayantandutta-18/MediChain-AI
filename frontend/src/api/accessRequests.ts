import { apiClient } from './client';
import type { AccessRequest, AccessRequestStatus, AccessStats, Paginated } from '@/types';

interface Envelope<T> {
  data: T;
}

export const accessRequestsApi = {
  list: async (params: { status?: AccessRequestStatus; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<Envelope<Paginated<AccessRequest>>>('/access-requests', { params });
    return data.data;
  },

  stats: async (): Promise<AccessStats> => {
    const { data } = await apiClient.get<Envelope<{ stats: AccessStats }>>('/access-requests/stats');
    return data.data.stats;
  },

  relationships: async (): Promise<AccessRequest[]> => {
    const { data } = await apiClient.get<Envelope<{ relationships: AccessRequest[] }>>(
      '/access-requests/relationships',
    );
    return data.data.relationships;
  },

  create: async (payload: { patientId: string; reason: string; purpose?: string }): Promise<AccessRequest> => {
    const { data } = await apiClient.post<Envelope<{ accessRequest: AccessRequest }>>('/access-requests', payload);
    return data.data.accessRequest;
  },

  decide: async (
    requestId: string,
    payload: { action: 'APPROVE' | 'REJECT'; durationDays?: number; decisionNote?: string },
  ): Promise<AccessRequest> => {
    const { data } = await apiClient.post<Envelope<{ accessRequest: AccessRequest }>>(
      `/access-requests/${requestId}/decision`,
      payload,
    );
    return data.data.accessRequest;
  },

  revoke: async (requestId: string, reason?: string): Promise<AccessRequest> => {
    const { data } = await apiClient.post<Envelope<{ accessRequest: AccessRequest }>>(
      `/access-requests/${requestId}/revoke`,
      { reason },
    );
    return data.data.accessRequest;
  },
};
