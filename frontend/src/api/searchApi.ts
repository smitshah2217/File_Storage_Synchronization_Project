import axiosInstance from './axiosInstance';
import type { SearchResultDto } from '../types';

export const searchApi = {
  search: async (query: string, page = 0, size = 20): Promise<SearchResultDto> => {
    const response = await axiosInstance.get<SearchResultDto>('/search', { params: { q: query, page, size } });
    return response.data;
  },
};
