import api from './client';
import { Settings } from '../types';

export const getSettings = async () => {
  const response = await api.get<Settings>('/settings');
  return response.data;
};

export const updateSettings = async (settings: Partial<Settings>) => {
  const response = await api.put<Settings>('/settings', settings);
  return response.data;
};
