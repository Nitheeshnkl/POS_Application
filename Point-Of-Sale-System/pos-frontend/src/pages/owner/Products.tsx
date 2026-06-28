import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/products';
import { getCategories } from '../../api/categories';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageToggle } from '../../components/ui/LanguageToggle';

const Products: React.FC = () => {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    nameEn: '',
    nameTa: '',
    categoryId: '',
    barcode: '',
    unitType: 'pcs' as Product['unitType'],
    purchasePrice: 0,
    sellingPrice: 0,
    minStockAlert: 5,
    initialStock: 0,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', searchTerm],
    queryFn: () => getProducts({ q: searchTerm }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<Product>) => updateProduct(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nameEn: product.nameEn,
        nameTa: product.nameTa,
        categoryId: product.categoryId,
        barcode: product.barcode || '',
        unitType: product.unitType,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        minStockAlert: product.minStockAlert,
        initialStock: 0,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nameEn: '',
        nameTa: '',
        categoryId: categories[0]?.id || '',
        barcode: '',
        unitType: 'pcs',
        purchasePrice: 0,
        sellingPrice: 0,
        minStockAlert: 5,
        initialStock: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: (p: Product) => (
        <div>
          <div className="font-medium">{p.nameEn}</div>
          <div className="text-xs text-slate-500">{p.nameTa}</div>
        </div>
      ),
    },
    {
      header: t('categories'),
      accessor: (p: Product) => (language === 'TA' ? p.category?.nameTa || p.category?.nameEn : p.category?.nameEn) || 'N/A',
    },
    { header: 'Unit', accessor: 'unitType' as const },
    {
      header: 'Stock',
      accessor: (p: Product) => (
        <div className="flex items-center space-x-2">
          <span>{p.currentStock}</span>
          {p.currentStock <= p.minStockAlert && (
            <Badge variant="danger">Low</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Purchase Price',
      accessor: (p: Product) => formatCurrency(p.purchasePrice),
    },
    {
      header: 'Selling Price',
      accessor: (p: Product) => formatCurrency(p.sellingPrice),
    },
    {
      header: 'Actions',
      accessor: (p: Product) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(p)}>
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleDelete(p.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('products')}</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add Product
          </Button>
          <LanguageToggle />
        </div>
      </div>

      <Table
        columns={columns}
        data={products}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingProduct ? t('update') : t('save')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('nameEnglish')}
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              required
            />
            <Input
              label={t('nameTamil')}
              value={formData.nameTa}
              onChange={(e) => setFormData({ ...formData, nameTa: e.target.value })}
            />
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">{t('categories')}</label>
              <select
                className="w-full border border-slate-300 rounded-md p-2"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === 'TA' ? c.nameTa || c.nameEn : c.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Type</label>
            <select
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={formData.unitType}
              onChange={(e) => setFormData({ ...formData, unitType: e.target.value as any })}
              required
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="packet">Packet</option>
              <option value="liter">Liter (l)</option>
            </select>
          </div>
          <Input
            label="Barcode"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          />
          <Input
            label="Min Stock Alert"
            type="number"
            value={formData.minStockAlert}
            onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
            required
          />
          <Input
            label="Purchase Price"
            type="number"
            step="0.01"
            value={formData.purchasePrice}
            onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
            required
          />
          <Input
            label="Selling Price"
            type="number"
            step="0.01"
            value={formData.sellingPrice}
            onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
            required
          />
          {!editingProduct && (
            <Input
              label="Initial Stock"
              type="number"
              value={formData.initialStock}
              onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
              required
            />
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Products;
