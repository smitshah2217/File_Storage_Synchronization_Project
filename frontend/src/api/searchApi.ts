import axiosInstance from './axiosInstance';

export const searchApi = {
  search: async (q: string, page = 0, size = 20) => {
    const response = await axiosInstance.get(`/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`);
    return response.data;
  }
};
