import axiosInstance from './axiosInstance';
import type { FolderContentDto, FolderDto } from '../types';

export const folderApi = {
  getRootContents: async (page = 0, size = 20): Promise<FolderContentDto> => {
    const response = await axiosInstance.get<FolderContentDto>('/folders/root', { params: { page, size } });
    return response.data;
  },
  getFolderContents: async (id: number, page = 0, size = 20): Promise<FolderContentDto> => {
    const response = await axiosInstance.get<FolderContentDto>(`/folders/${id}`, { params: { page, size } });
    return response.data;
  },
  createFolder: async (name: string, parentFolderId: number | null): Promise<FolderDto> => {
    const response = await axiosInstance.post<FolderDto>('/folders', { name, parentFolderId });
    return response.data;
  },
  updateFolder: async (id: number, data: { name?: string; parentFolderId?: number; moveToRoot?: boolean }): Promise<FolderDto> => {
    const response = await axiosInstance.put<FolderDto>(`/folders/${id}`, data);
    return response.data;
  },
  deleteFolder: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/folders/${id}`);
  },
  restoreFolder: async (id: number): Promise<void> => {
    await axiosInstance.post(`/folders/${id}/restore`);
  },
  permanentDeleteFolder: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/folders/${id}/permanent`);
  },
  getBreadcrumb: async (id: number): Promise<FolderDto[]> => {
    const response = await axiosInstance.get<FolderDto[]>(`/folders/${id}/breadcrumb`);
    return response.data;
  },
};
