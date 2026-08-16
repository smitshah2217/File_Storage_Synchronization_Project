import axiosInstance from './axiosInstance';
import type { FileDto, FileVersionDto } from '../types';

export const fileApi = {
  uploadFile: async (file: File, folderId: number | null): Promise<FileDto> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId.toString());
    
    const response = await axiosInstance.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadBatch: async (files: File[], folderId: number | null): Promise<FileDto[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (folderId) formData.append('folderId', folderId.toString());
    
    const response = await axiosInstance.post('/files/upload-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getFile: async (id: number): Promise<FileDto> => {
    const response = await axiosInstance.get(`/files/${id}`);
    return response.data;
  },
  updateFile: async (id: number, data: { name?: string; folderId?: number; moveToRoot?: boolean }): Promise<FileDto> => {
    const response = await axiosInstance.put(`/files/${id}`, data);
    return response.data;
  },
  deleteFile: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/files/${id}`);
  },
  restoreFile: async (id: number): Promise<void> => {
    await axiosInstance.post(`/files/${id}/restore`);
  },
  permanentDeleteFile: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/files/${id}/permanent`);
  },
  getDownloadUrl: (id: number): string => {
    // We return the raw URL since download will be handled by browser
    // But since it needs JWT, we must fetch it as a blob
    return `/api/files/${id}/download`;
  },
  downloadFile: async (id: number, filename: string): Promise<void> => {
    const response = await axiosInstance.get(`/files/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  getPreviewUrl: async (id: number): Promise<string> => {
    const response = await axiosInstance.get(`/files/${id}/preview`, { responseType: 'blob' });
    return window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] as string }));
  },
  getVersions: async (id: number): Promise<FileVersionDto[]> => {
    const response = await axiosInstance.get(`/files/${id}/versions`);
    return response.data;
  },
  downloadVersion: async (id: number, version: number, filename: string): Promise<void> => {
    const response = await axiosInstance.get(`/files/${id}/versions/${version}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  getPreviewUrlForVersion: async (id: number, version: number): Promise<string> => {
    const response = await axiosInstance.get(`/files/${id}/versions/${version}/preview`, { responseType: 'blob' });
    return window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] as string }));
  },
  uploadNewVersion: async (id: number, file: File): Promise<FileVersionDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/files/${id}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
};
