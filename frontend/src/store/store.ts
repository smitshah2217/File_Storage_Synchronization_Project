import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import storageReducer from './storageSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    storage: storageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
