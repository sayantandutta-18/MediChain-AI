import { apiClient } from './client';
import type { EmergencyProfile, EmergencyToken } from '../types';

export const emergencyApi = {
  getProfile: async (): Promise<EmergencyProfile> => {
    const response = await apiClient.get('/api/v1/emergency');
    return response.data.data;
  },

  updateProfile: async (
    data: Partial<Omit<EmergencyProfile, 'id' | 'patientId' | 'updatedAt'>>
  ): Promise<EmergencyProfile> => {
    const response = await apiClient.put('/api/v1/emergency', data);
    return response.data.data;
  },

  generateToken: async (): Promise<EmergencyToken> => {
    const response = await apiClient.post('/api/v1/emergency/share');
    return response.data.data;
  },

  accessByToken: async (token: string): Promise<{
    patientName: string;
    profile: EmergencyProfile;
    patientId: string;
  }> => {
    const response = await apiClient.get(`/api/v1/emergency/access/${token}`);
    return response.data.data;
  }
};
