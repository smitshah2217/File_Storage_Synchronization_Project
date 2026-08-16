import axiosInstance from './axiosInstance';
import { FolderContentDto, FolderDto } from '../types';

export const folderApi = {
  getRootContents: async (): Promise<FolderContentDto> => {
    const response = await axiosInstance.get('/folders/root');
    return response.data;
  },
  getFolderContents: async (id: number): Promise<FolderContentDto> => {
    const response = await axiosInstance.get(`/folders/${id}`);
    return response.data;
  },
  createFolder: async (name: string, parentFolderId: number | null): Promise<FolderDto> => {
    const response = await axiosInstance.post('/folders', { name, parentFolderId });
    return response.data;
  },
  updateFolder: async (id: number, data: { name?: string; parentFolderId?: number; moveToRoot?: boolean }): Promise<FolderDto> => {
    const response = await axiosInstance.put(`/folders/${id}`, data);
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
    const response = await axiosInstance.get(`/folders/${id}/breadcrumb`);
    return response.data;
  },
};
