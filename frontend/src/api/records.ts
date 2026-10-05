import { apiClient, tokenStorage } from './client';
import type { MedicalRecord, Paginated, RecordCategory, RecordStats, VerificationReport } from '@/types';

interface Envelope<T> {
  data: T;
}

export interface UploadRecordPayload {
  file: File;
  title: string;
  category: RecordCategory;
  description?: string;
}

export const recordsApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    category?: RecordCategory;
    search?: string;
    startDate?: string;
    endDate?: string;
    verificationStatus?: string;
  } = {}): Promise<Paginated<MedicalRecord>> => {
    const { data } = await apiClient.get<Envelope<Paginated<MedicalRecord>>>('/records', { params });
    return data.data;
  },

  get: async (recordId: string): Promise<MedicalRecord> => {
    const { data } = await apiClient.get<Envelope<{ record: MedicalRecord }>>(`/records/${recordId}`);
    return data.data.record;
  },

  upload: async (payload: UploadRecordPayload): Promise<MedicalRecord> => {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('title', payload.title);
    form.append('category', payload.category);
    if (payload.description) form.append('description', payload.description);

    const { data } = await apiClient.post<Envelope<{ record: MedicalRecord }>>('/records', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.record;
  },

  uploadVersion: async (recordId: string, file: File): Promise<MedicalRecord> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<Envelope<{ record: MedicalRecord }>>(`/records/${recordId}/versions`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.record;
  },

  getVersions: async (recordId: string): Promise<any[]> => {
    const { data } = await apiClient.get<Envelope<{ versions: any[] }>>(`/records/${recordId}/versions`);
    return data.data.versions;
  },

  downloadVersion: async (recordId: string, versionNumber: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/records/${recordId}/versions/${versionNumber}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  update: async (
    recordId: string,
    payload: Partial<Pick<MedicalRecord, 'title' | 'description' | 'category'>>,
  ): Promise<MedicalRecord> => {
    const { data } = await apiClient.patch<Envelope<{ record: MedicalRecord }>>(`/records/${recordId}`, payload);
    return data.data.record;
  },

  remove: async (recordId: string): Promise<void> => {
    await apiClient.delete(`/records/${recordId}`);
  },

  verify: async (recordId: string): Promise<VerificationReport> => {
    const { data } = await apiClient.get<Envelope<{ verification: VerificationReport }>>(
      `/records/${recordId}/verify`,
    );
    return data.data.verification;
  },

  stats: async (): Promise<RecordStats> => {
    const { data } = await apiClient.get<Envelope<{ stats: RecordStats }>>('/records/stats');
    return data.data.stats;
  },

  /** Streams the decrypted original file straight to the browser. */
  download: async (recordId: string, fileName: string): Promise<void> => {
    const response = await apiClient.get(`/records/${recordId}/download`, {
      responseType: 'blob',
      headers: tokenStorage.get() ? { Authorization: `Bearer ${tokenStorage.get()}` } : undefined,
    });

    const url = URL.createObjectURL(response.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
