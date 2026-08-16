import axiosInstance from './axiosInstance';
import type {  StorageUsageDto  } from '../types';

export const userApi = {
  getStorageUsage: async (): Promise<StorageUsageDto> => {
    const response = await axiosInstance.get('/users/me/storage');
    return response.data;
  }
};
