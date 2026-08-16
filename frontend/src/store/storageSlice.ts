import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {  FolderDto  } from '../types';

interface StorageState {
  currentFolderId: number | null;
  breadcrumbs: FolderDto[];
  searchQuery: string;
}

const initialState: StorageState = {
  currentFolderId: null,
  breadcrumbs: [],
  searchQuery: '',
};

const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    setCurrentFolder: (state, action: PayloadAction<number | null>) => {
      state.currentFolderId = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<FolderDto[]>) => {
      state.breadcrumbs = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    resetStorageState: (state) => {
      state.currentFolderId = null;
      state.breadcrumbs = [];
      state.searchQuery = '';
    }
  },
});

export const { setCurrentFolder, setBreadcrumbs, setSearchQuery, resetStorageState } = storageSlice.actions;
export default storageSlice.reducer;
