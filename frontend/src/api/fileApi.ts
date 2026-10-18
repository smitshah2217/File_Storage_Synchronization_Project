import axiosInstance from './axiosInstance';
import type { FileDto, FileVersionDto, PageResponse } from '../types';

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const fileApi = {
  uploadFile: async (file: File, folderId: number | null): Promise<FileDto> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId !== null) formData.append('folderId', folderId.toString());
    const response = await axiosInstance.post<FileDto>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadBatch: async (files: File[], folderId: number | null): Promise<FileDto[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (folderId !== null) formData.append('folderId', folderId.toString());
    const response = await axiosInstance.post<FileDto[]>('/files/upload-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getFile: async (id: number): Promise<FileDto> => {
    const response = await axiosInstance.get<FileDto>(`/files/${id}`);
    return response.data;
  },
  updateFile: async (id: number, data: { name?: string; folderId?: number; moveToRoot?: boolean }): Promise<FileDto> => {
    const response = await axiosInstance.put<FileDto>(`/files/${id}`, data);
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
  downloadFile: async (id: number, filename: string): Promise<void> => {
    const response = await axiosInstance.get<Blob>(`/files/${id}/download`, { responseType: 'blob' });
    saveBlob(response.data, filename);
  },
  getPreviewUrl: async (id: number): Promise<string> => {
    const response = await axiosInstance.get<Blob>(`/files/${id}/preview`, { responseType: 'blob' });
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: response.headers['content-type'] as string });
    return window.URL.createObjectURL(blob);
  },
  getVersions: async (id: number, page = 0, size = 20): Promise<PageResponse<FileVersionDto>> => {
    const response = await axiosInstance.get<PageResponse<FileVersionDto>>(`/files/${id}/versions`, { params: { page, size } });
    return response.data;
  },
  getVersion: async (id: number, version: number): Promise<FileVersionDto> => {
    const response = await axiosInstance.get<FileVersionDto>(`/files/${id}/versions/${version}`);
    return response.data;
  },
  downloadVersion: async (id: number, version: number, filename: string): Promise<void> => {
    const response = await axiosInstance.get<Blob>(`/files/${id}/versions/${version}/download`, { responseType: 'blob' });
    saveBlob(response.data, filename);
  },
  getPreviewUrlForVersion: async (id: number, version: number): Promise<string> => {
    const response = await axiosInstance.get<Blob>(`/files/${id}/versions/${version}/preview`, { responseType: 'blob' });
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: response.headers['content-type'] as string });
    return window.URL.createObjectURL(blob);
  },
  uploadNewVersion: async (id: number, file: File): Promise<FileDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<FileDto>(`/files/${id}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  restoreVersion: async (id: number, version: number): Promise<FileDto> => {
    const response = await axiosInstance.post<FileDto>(`/files/${id}/versions/${version}/restore`);
    return response.data;
  },
};
