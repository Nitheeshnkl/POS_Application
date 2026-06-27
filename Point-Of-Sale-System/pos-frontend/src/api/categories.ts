import api from './client';
import { Category } from '../types';

export const getCategories = async () => {
  const response = await api.get<Category[]>('/categories');
  return response.data;
};

export const createCategory = async (data: { nameEn: string; nameTa: string }) => {
  const response = await api.post<Category>('/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: { nameEn: string; nameTa: string }) => {
  const response = await api.put<Category>(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};
