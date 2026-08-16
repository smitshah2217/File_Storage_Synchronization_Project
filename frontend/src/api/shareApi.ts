import axiosInstance from './axiosInstance';
import type { ShareDto } from '../types';

export const shareApi = {
  getSharedWithMe: async (): Promise<ShareDto[]> => {
    const response = await axiosInstance.get('/shared-with-me');
    return response.data;
  },
  getFileShares: async (fileId: number): Promise<ShareDto[]> => {
    const response = await axiosInstance.get(`/files/${fileId}/shares`);
    return response.data;
  },
  createShare: async (fileId: number, data: { sharedWithUsername?: string; isPublic: boolean; expiresAt?: string }): Promise<ShareDto> => {
    const response = await axiosInstance.post(`/files/${fileId}/share`, data);
    return response.data;
  },
  revokeShare: async (shareId: number): Promise<void> => {
    await axiosInstance.delete(`/shares/${shareId}`);
  }
};
