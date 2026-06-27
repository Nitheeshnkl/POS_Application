import apiClient from './client';
import { User } from '../types';

export const login = async (credentials: { username: string; password: string }): Promise<{ user: User; accessToken: string }> => {
  const { data } = await apiClient.post('/auth/login', credentials);
  return data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get('/auth/me');
  return data;
};
