import axiosInstance from './axiosInstance';
import type { User } from '../types';

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface RefreshResponse {
  token: string;
  expiresIn: number;
}

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },
  register: async (userData: RegistrationData): Promise<User> => {
    const response = await axiosInstance.post<User>('/auth/register', userData);
    return response.data;
  },
  refresh: async (): Promise<RefreshResponse> => {
    const response = await axiosInstance.post<RefreshResponse>('/auth/refresh');
    return response.data;
  },
  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout');
  },
};
