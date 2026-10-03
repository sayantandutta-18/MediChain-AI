import { apiClient } from './client';

export interface ShareTokenResult {
  token: string;
  expiresAt: string;
}

export interface SharedRecordAccess {
  patientName: string;
  recordId: string;
  record: any; // We can type this fully if needed
}

export const shareApi = {
  generateToken: async (recordId: string, durationHours: number = 24): Promise<ShareTokenResult> => {
    const response = await apiClient.post('/api/v1/share/generate', { recordId, durationHours });
    return response.data.data;
  },

  accessByToken: async (token: string): Promise<SharedRecordAccess> => {
    const response = await apiClient.get(`/api/v1/share/access/${token}`);
    return response.data.data;
  },

  getDownloadUrl: (token: string): string => {
    // Return relative URL that will hit proxy in dev or full URL in prod
    return `/api/v1/share/access/${token}/download`;
  }
};
