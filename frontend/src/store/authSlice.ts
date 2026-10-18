import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const readStoredUser = (): User | null => {
  try {
    const value = localStorage.getItem('user');
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const initialToken = localStorage.getItem('token');
const initialState: AuthState = {
  token: initialToken && initialToken !== 'undefined' ? initialToken : null,
  user: readStoredUser(),
  isAuthenticated: Boolean(initialToken && initialToken !== 'undefined'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { setCredentials, updateUser, updateToken, logout } = authSlice.actions;
export default authSlice.reducer;
