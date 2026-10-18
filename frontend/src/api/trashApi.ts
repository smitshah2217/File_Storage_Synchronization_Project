import axiosInstance from './axiosInstance';
import type { TrashContentsDto } from '../types';

export const trashApi = {
  getTrashContents: async (page = 0, size = 20): Promise<TrashContentsDto> => {
    const response = await axiosInstance.get<TrashContentsDto>('/trash', { params: { page, size } });
    return response.data;
  },
  emptyTrash: async (): Promise<void> => {
    await axiosInstance.delete('/trash');
  },
};
