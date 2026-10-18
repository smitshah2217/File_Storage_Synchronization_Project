import axiosInstance from './axiosInstance';
import type { DownloadHistoryDto, PageResponse } from '../types';

export const historyApi = {
  getDownloadHistory: async (page = 0, size = 20): Promise<PageResponse<DownloadHistoryDto>> => {
    const response = await axiosInstance.get<PageResponse<DownloadHistoryDto>>('/download-history', { params: { page, size } });
    return response.data;
  },
  clearDownloadHistory: async (): Promise<void> => {
    await axiosInstance.delete('/download-history');
  },
};
