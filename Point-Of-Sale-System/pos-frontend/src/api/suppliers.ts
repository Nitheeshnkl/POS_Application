import api from './client';
import { Supplier, Purchase, SupplierTransaction } from '../types';

export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await api.get('/suppliers');
  return response.data;
};

export const getSupplierById = async (id: string): Promise<Supplier> => {
  const response = await api.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (data: Partial<Supplier>): Promise<Supplier> => {
  const response = await api.post('/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
  const response = await api.put(`/suppliers/${id}`, data);
  return response.data;
};

export const getSupplierPurchases = async (id: string): Promise<Purchase[]> => {
  const response = await api.get(`/suppliers/${id}/purchases`);
  return response.data;
};


export const getSupplierTransactions = async (id: string): Promise<SupplierTransaction[]> => {
  const response = await api.get(`/suppliers/${id}/transactions`);
  return response.data;
};

export const addSupplierTransaction = async (id: string, data: Partial<SupplierTransaction>): Promise<SupplierTransaction> => {
  const response = await api.post(`/suppliers/${id}/transactions`, data);
  return response.data;
};
