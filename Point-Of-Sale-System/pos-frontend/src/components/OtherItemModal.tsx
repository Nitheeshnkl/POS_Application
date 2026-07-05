import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useLanguage } from '../i18n/LanguageContext';

interface OtherItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onSubmit: (data: { name: string; qty: number; price: number; tax: number; discount: number }) => void;
}

export const OtherItemModal: React.FC<OtherItemModalProps> = ({ isOpen, onClose, initialName = 'Other', onSubmit }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [tax, setTax] = useState('');
  const [discount, setDiscount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName.trim() || 'Other');
      setQty('1');
      setPrice('');
      setTax('');
      setDiscount('');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">Quick Bill</h2>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            name: name.trim() || 'Other',
            qty: parseFloat(qty) || 1,
            price: parseFloat(price) || 0,
            tax: parseFloat(tax) || 0,
            discount: parseFloat(discount) || 0,
          });
        }} className="p-4 md:p-6 space-y-4">
          <Input label="Item Name" value={name} onChange={(e: any) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" step="0.001" min="0.001" value={qty} onChange={(e: any) => setQty(e.target.value)} required />
            <Input label="Unit Price (₹)" type="number" step="0.01" min="0" value={price} onChange={(e: any) => setPrice(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tax (%)" type="number" step="0.01" min="0" value={tax} onChange={(e: any) => setTax(e.target.value)} />
            <Input label="Discount (₹)" type="number" step="0.01" min="0" value={discount} onChange={(e: any) => setDiscount(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="secondary" onClick={onClose} type="button">{t('cancel') || 'Cancel'}</Button>
            <Button type="submit">{t('add' as any) || 'Add to Bill'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
