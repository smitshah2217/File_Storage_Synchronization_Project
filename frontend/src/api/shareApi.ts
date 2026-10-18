import axiosInstance from './axiosInstance';
import type { PageResponse, ShareDto } from '../types';

export const shareApi = {
  getSharedWithMe: async (page = 0, size = 20): Promise<PageResponse<ShareDto>> => {
    const response = await axiosInstance.get<PageResponse<ShareDto>>('/shared/files', { params: { page, size } });
    return response.data;
  },
  getSharedByMe: async (page = 0, size = 20): Promise<PageResponse<ShareDto>> => {
    const response = await axiosInstance.get<PageResponse<ShareDto>>('/shared/by-me', { params: { page, size } });
    return response.data;
  },
  getFileShares: async (fileId: number, page = 0, size = 20): Promise<PageResponse<ShareDto>> => {
    const response = await axiosInstance.get<PageResponse<ShareDto>>(`/files/${fileId}/share`, { params: { page, size } });
    return response.data;
  },
  createShare: async (fileId: number, data: { sharedWithUsername: string; permission: 'VIEW' | 'EDIT' }): Promise<ShareDto> => {
    const response = await axiosInstance.post<ShareDto>(`/files/${fileId}/share`, data);
    return response.data;
  },
  updateShare: async (fileId: number, shareId: number, permission: 'VIEW' | 'EDIT'): Promise<ShareDto> => {
    const response = await axiosInstance.put<ShareDto>(`/files/${fileId}/share/${shareId}`, { permission });
    return response.data;
  },
  revokeShare: async (fileId: number, shareId: number): Promise<void> => {
    await axiosInstance.delete(`/files/${fileId}/share/${shareId}`);
  },
};
