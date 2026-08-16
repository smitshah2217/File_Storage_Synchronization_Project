import axiosInstance from './axiosInstance';
import type { DownloadHistoryDto } from '../types';

export const historyApi = {
  getDownloadHistory: async (): Promise<DownloadHistoryDto[]> => {
    const response = await axiosInstance.get('/download-history');
    return response.data;
  }
};
