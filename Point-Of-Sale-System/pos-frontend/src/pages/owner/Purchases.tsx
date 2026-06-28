import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchases, createPurchase, getPurchase } from '../../api/purchases';
import { searchProducts } from '../../api/products';
import { getSuppliers } from '../../api/suppliers';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Plus, Trash2, Eye } from 'lucide-react';
import { Purchase } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const Purchases: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    supplierPhone: '',
    invoiceNumber: '',
    paymentMode: 'cash',
    items: [] as any[],
  });

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => getPurchases(),
  });

  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      handleCloseModal();
    },
  });

  const handleOpenModal = () => {
    setFormData({
      supplierId: '',
      supplierName: '',
      supplierPhone: '',
      invoiceNumber: '',
      paymentMode: 'cash',
      items: [{ productId: '', productNameEn: '', qty: '', purchasePrice: '', total: 0 }],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', productNameEn: '', qty: '', purchasePrice: '', total: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    if (field === 'qty' || field === 'purchasePrice') {
      newItems[index].total = (Number(newItems[index].qty) || 0) * (Number(newItems[index].purchasePrice) || 0);
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = async (index: number, q: string) => {
    if (q.length < 2) return;
    const products = await searchProducts(q);
    if (products && products.length > 0) {
      const product = products[0];
      const newItems = [...formData.items];
      newItems[index].productId = product.id;
      newItems[index].productNameEn = product.nameEn;
      newItems[index].purchasePrice = product.purchasePrice.toString();
      newItems[index].total = (Number(newItems[index].qty) || 0) * product.purchasePrice;
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mappedItems = formData.items.map(item => ({
      product_id: item.productId,
      quantity: Number(item.qty),
      unit_price: Number(item.purchasePrice),
    })) as any[];
    const totalAmount = mappedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    createMutation.mutate({ 
      supplierName: formData.supplierName,
      supplierPhone: formData.supplierPhone,
      invoiceNumber: formData.invoiceNumber,
      paymentMode: formData.paymentMode,
      items: mappedItems,
      totalAmount 
    });
  };

  const handleViewPurchase = async (purchase: Purchase) => {
    const data = await getPurchase(purchase.id);
    setSelectedPurchase(data);
    setIsViewModalOpen(true);
  };

  const columns = [
    { header: 'Supplier', accessor: 'supplierName' as const },
    { header: 'Invoice #', accessor: 'invoiceNumber' as const },
    {
      header: 'Date',
      accessor: (p: Purchase) => formatDate(p.purchaseDate),
    },
    {
      header: 'Total Amount',
      accessor: (p: Purchase) => formatCurrency(p.totalAmount),
    },
    { header: 'Payment', accessor: 'paymentMode' as const },
    {
      header: 'Actions',
      accessor: (p: Purchase) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewPurchase(p)}>
          <Eye size={16} className="mr-2" /> View
        </Button>
      ),
    },
  ];

  const grandTotal = formData.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Purchases</h1>
        <Button onClick={handleOpenModal}>
          <Plus size={20} className="mr-2" />
          New Purchase
        </Button>
      </div>

      <Table
        columns={columns}
        data={purchases}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="New Purchase"
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={createMutation.isPending}>
              Save Purchase
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-700">Supplier</label>
              <select
                value={formData.supplierId}
                onChange={(e) => {
                  const s = suppliers.find(sup => sup.id === e.target.value);
                  if (s) {
                    setFormData({ ...formData, supplierId: s.id, supplierName: s.name, supplierPhone: s.phone || '' });
                  } else {
                    setFormData({ ...formData, supplierId: '', supplierName: '', supplierPhone: '' });
                  }
                }}
                className="w-full box-border border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                required
              >
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Input
              label="Invoice Number"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
              <select
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus size={16} className="mr-1" /> Add Row
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Input
                      placeholder="Search product..."
                      value={item.productNameEn}
                      onChange={(e) => {
                        handleItemChange(index, 'productNameEn', e.target.value);
                        handleProductSelect(index, e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      step="0.01"
                      value={item.purchasePrice}
                      onChange={(e) => handleItemChange(index, 'purchasePrice', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={formatCurrency(item.total)}
                      disabled
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleRemoveItem(index)}
                      disabled={formData.items.length === 1}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="text-right">
                <span className="text-sm text-slate-500">Grand Total</span>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(grandTotal)}</div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Purchase Details"
        size="lg"
      >
        {selectedPurchase && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500 block">Supplier</span>
                <span className="font-medium">{selectedPurchase.supplierName}</span>
                {selectedPurchase.supplierPhone && <div className="text-sm">{selectedPurchase.supplierPhone}</div>}
              </div>
              <div>
                <span className="text-sm text-slate-500 block">Invoice Info</span>
                <span className="font-medium">{selectedPurchase.invoiceNumber || 'N/A'}</span>
                <div className="text-sm">{formatDate(selectedPurchase.purchaseDate)}</div>
              </div>
            </div>

            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedPurchase.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{item.nameEn || '—'}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="px-4 py-2 text-right">Grand Total</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(selectedPurchase.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Purchases;
