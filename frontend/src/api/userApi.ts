import axiosInstance from './axiosInstance';
import type { StorageUsageDto, User } from '../types';

export const userApi = {
  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/users/me');
    return response.data;
  },
  updateProfile: async (data: { username?: string; email?: string }): Promise<User> => {
    const response = await axiosInstance.put<User>('/users/me', data);
    return response.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await axiosInstance.put('/users/me/password', data);
  },
  getStorageUsage: async (): Promise<StorageUsageDto> => {
    const response = await axiosInstance.get<StorageUsageDto>('/users/me/storage');
    return response.data;
  },
};
