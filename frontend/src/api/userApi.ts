import axiosInstance from './axiosInstance';
import { StorageUsageDto } from '../types';

export const userApi = {
  getStorageUsage: async (): Promise<StorageUsageDto> => {
    const response = await axiosInstance.get('/users/me/storage');
    return response.data;
  }
};
