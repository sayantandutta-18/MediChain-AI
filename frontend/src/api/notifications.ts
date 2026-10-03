import { apiClient } from './client';
import type { Paginated } from '@/types';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export type NotificationType =
  | 'access.requested'
  | 'access.approved'
  | 'access.rejected'
  | 'access.revoked'
  | 'record.uploaded'
  | 'security.alert'
  | 'security.login'
  | 'ai.completed'
  | 'verification.completed'
  | 'appointment.requested'
  | 'appointment.updated'
  | 'share.created'
  | 'share.accessed'
  | 'emergency.accessed';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationSummary {
  unread: number;
  latest: {
    id: string;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    link: string | null;
    createdAt: string;
  } | null;
}

interface Envelope<T> {
  data: T;
}

export const notificationsApi = {
  list: async (params: { unreadOnly?: boolean; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<Envelope<Paginated<AppNotification>>>('/notifications', { params });
    return data.data;
  },

  summary: async (): Promise<NotificationSummary> => {
    const { data } = await apiClient.get<Envelope<{ summary: NotificationSummary }>>('/notifications/summary');
    return data.data.summary;
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<number> => {
    const { data } = await apiClient.post<Envelope<{ updated: number }>>('/notifications/read-all');
    return data.data.updated;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};