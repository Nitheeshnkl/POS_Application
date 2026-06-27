import api from './client';
import { Product } from '../types';

export const getProducts = async (params?: { q?: string; category_id?: string; is_active?: boolean }) => {
  const response = await api.get<Product[]>('/products', { params });
  return response.data;
};

export const getProduct = async (id: string) => {
  const response = await api.get<Product>(`/products/${id}`);
  return response.data;
};

export const searchProducts = async (q: string) => {
  const response = await api.get<Product[]>('/products/search', { params: { q } });
  return response.data;
};

export const createProduct = async (data: Partial<Product> & { initialStock?: number }) => {
  const response = await api.post<Product>('/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const response = await api.put<Product>(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
