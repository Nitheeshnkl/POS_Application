import api from './client';
import { User } from '../types';

export const getUsers = async () => {
  const response = await api.get<User[]>('/users');
  return response.data;
};

export const createUser = async (user: Omit<User, 'id' | 'createdAt' | 'isActive'> & { password?: string }) => {
  const response = await api.post<User>('/users', user);
  return response.data;
};

export const updateUser = async (id: string, user: Partial<User>) => {
  const response = await api.put<User>(`/users/${id}`, user);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};
