import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategories } from '../api/categories';
import { Category } from '../types';

interface ManualProductEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearch: string;
  onSubmit: (data: any) => void;
  isPending: boolean;
}

export const ManualProductEntryModal: React.FC<ManualProductEntryModalProps> = ({ isOpen, onClose, initialSearch, onSubmit, isPending }) => {
  const { t } = useLanguage();
  
  const [nameEn, setNameEn] = useState(initialSearch);
  const [nameTa, setNameTa] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [unitType, setUnitType] = useState('pcs');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      setNameEn(initialSearch);
      setNameTa('');
      setPurchasePrice('');
      setSellingPrice('');
      setOpeningStock('');
      if (categories.length > 0) setCategoryId(Number(categories[0].id));
    }
  }, [isOpen, initialSearch, categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden my-8">
        <div className="p-4 md:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg md:text-xl font-bold">Add Product Instantly</h2>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ 
            nameEn, 
            nameTa, 
            categoryId,
            unitType,
            purchasePrice: parseFloat(purchasePrice) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            initialStock: parseFloat(openingStock) || 0
          });
        }} className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label="Name (English)" value={nameEn} onChange={(e: any) => setNameEn(e.target.value)} required />
          <Input label="Name (Tamil)" value={nameTa} onChange={(e: any) => setNameTa(e.target.value)} />
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameEn}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pcs">Pcs</option>
              <option value="kg">Kg</option>
              <option value="g">g</option>
              <option value="ltr">Ltr</option>
              <option value="ml">ml</option>
              <option value="box">Box</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Purchase Price (₹)" type="number" step="0.01" min="0" value={purchasePrice} onChange={(e: any) => setPurchasePrice(e.target.value)} required />
            <Input label="Selling Price (₹)" type="number" step="0.01" min="0" value={sellingPrice} onChange={(e: any) => setSellingPrice(e.target.value)} required />
          </div>
          
          <Input label="Opening Stock" type="number" step="0.01" min="0" value={openingStock} onChange={(e: any) => setOpeningStock(e.target.value)} required />

          <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-white">
            <Button variant="secondary" onClick={onClose} type="button">{t('cancel') || 'Cancel'}</Button>
            <Button type="submit" isLoading={isPending}>{t('save') || 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
