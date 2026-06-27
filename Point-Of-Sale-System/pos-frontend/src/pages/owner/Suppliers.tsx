import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { getSuppliers, createSupplier, updateSupplier, getSupplierPurchases } from '../../api/suppliers';
import { Supplier } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const emptyForm = { name: '', phone: '', email: '', gstin: '', address: '', notes: '' };

const Suppliers: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['supplier-purchases', selectedSupplier?.id],
    queryFn: () => getSupplierPurchases(selectedSupplier!.id),
    enabled: !!selectedSupplier,
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      toast.success('Supplier added');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      handleCloseModal();
    },
    onError: () => toast.error('Failed to add supplier'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => updateSupplier(id, data),
    onSuccess: () => {
      toast.success('Supplier updated');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update supplier'),
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone || '', email: s.email || '', gstin: s.gstin || '', address: s.address || '', notes: s.notes || '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const f = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <Button onClick={() => setShowModal(true)}>+ Add Supplier</Button>
        </div>

        <Table
          columns={[
            { header: 'Name', accessor: 'name' },
            { header: 'Phone', accessor: (v: any) => v.phone || '—' },
            { header: 'Email', accessor: (v: any) => v.email || '—' },
            { header: 'GSTIN', accessor: (v: any) => v.gstin || '—' },
            {
              header: 'Actions',
              accessor: (v: any) => (
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:underline text-sm"
                    onClick={() => handleEdit(v)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-green-600 hover:underline text-sm"
                    onClick={() => setSelectedSupplier(v)}
                  >
                    Purchases
                  </button>
                </div>
              ),
            },
          ]}
          data={suppliers || []}
          isLoading={isLoading}
          keyExtractor={(v: any) => v.id}
        />

        {/* Add / Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editing ? 'Edit Supplier' : 'Add Supplier'}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Name *" required value={form.name} onChange={f('name')} />
            <Input label="Phone" value={form.phone} onChange={f('phone')} />
            <Input label="Email" type="email" value={form.email} onChange={f('email')} />
            <Input label="GSTIN" value={form.gstin} onChange={f('gstin')} />
            <Input label="Address" value={form.address} onChange={f('address')} />
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={2}
                value={form.notes}
                onChange={f('notes')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Update' : 'Add'} Supplier
              </Button>
            </div>
          </form>
        </Modal>

        {/* Purchase History Modal */}
        <Modal
          isOpen={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          title={`Purchases — ${selectedSupplier?.name}`}
        >
          <Table
            columns={[
              { header: 'Date', accessor: (v: any) => formatDate(v.purchaseDate) },
              { header: 'Invoice', accessor: (v: any) => v.invoiceNumber || '—' },
              { header: 'Total', accessor: (v: any) => formatCurrency(v.totalAmount) },
              { header: 'Payment', accessor: 'paymentMode' },
            ]}
            data={purchases || []}
            isLoading={purchasesLoading}
            keyExtractor={(v: any) => v.id}
          />
        </Modal>
      </div>
    </>
  );
};

export default Suppliers;
