import api from './client';

export interface RequestedProduct {
  id: number;
  productName: string;
  productNameTa: string | null;
  notes: string | null;
  requestedCount: number;
  requestedByName: string | null;
  status: 'requested' | 'ordered' | 'stocked' | 'ignored';
  createdAt: string;
}

export const getRequestedProducts = async () => {
  const response = await api.get<RequestedProduct[]>('/requested-products');
  return response.data;
};

export const createRequestedProduct = async (data: { productName: string; productNameTa?: string; notes?: string }) => {
  const response = await api.post<RequestedProduct>('/requested-products', data);
  return response.data;
};

export const updateRequestedProductStatus = async (id: number, status: string) => {
  const response = await api.put<RequestedProduct>(`/requested-products/${id}/status`, { status });
  return response.data;
};
