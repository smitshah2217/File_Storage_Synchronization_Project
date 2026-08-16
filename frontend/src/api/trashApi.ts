import axiosInstance from './axiosInstance';
import type {  TrashContentsDto  } from '../types';

export const trashApi = {
  getTrashContents: async (): Promise<TrashContentsDto> => {
    const response = await axiosInstance.get('/trash');
    return response.data;
  },
  emptyTrash: async (): Promise<void> => {
    await axiosInstance.delete('/trash');
  }
};
