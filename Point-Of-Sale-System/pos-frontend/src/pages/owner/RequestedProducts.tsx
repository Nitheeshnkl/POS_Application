import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestedProducts, createRequestedProduct, updateRequestedProductStatus } from '../../api/requested_products';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/formatDate';

const RequestedProducts: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // ── new note form ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productName: '', productNameTa: '', notes: '' });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requested-products'],
    queryFn: getRequestedProducts
  });

  const createMutation = useMutation({
    mutationFn: createRequestedProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requested-products'] });
      setForm({ productName: '', productNameTa: '', notes: '' });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => updateRequestedProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requested-products'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim()) return;
    createMutation.mutate({ productName: form.productName, productNameTa: form.productNameTa, notes: form.notes });
  };

  const columns = [
    { header: t('nameEnglish'), accessor: 'productName' as const },
    { header: t('nameTamil'), accessor: 'productNameTa' as const },
    { header: t('requests'), accessor: 'requestedCount' as const },
    { header: t('notes'), accessor: 'notes' as const },
    { header: t('date'), accessor: (r: any) => formatDate(r.createdAt) },
    {
      header: t('status'),
      accessor: (r: any) => (
        <Badge variant={r.status === 'requested' ? 'warning' : r.status === 'ordered' ? 'info' : r.status === 'stocked' ? 'success' : 'danger'}>
          {r.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: t('actions'),
      accessor: (r: any) => (
        <div className="flex space-x-2">
          {r.status === 'requested' && (
            <Button size="sm" onClick={() => updateMutation.mutate({ id: r.id, status: 'ordered' })}>
              {t('order')}
            </Button>
          )}
          {(r.status === 'requested' || r.status === 'ordered') && (
            <Button size="sm" variant="primary" onClick={() => updateMutation.mutate({ id: r.id, status: 'stocked' })}>
              {t('stocked')}
            </Button>
          )}
          {r.status !== 'ignored' && (
            <Button size="sm" variant="danger" onClick={() => updateMutation.mutate({ id: r.id, status: 'ignored' })}>
              {t('ignore')}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('notes')}</h1>
        <Button onClick={() => setShowForm(v => !v)}>
          {showForm ? t('cancel') : t('logNote')}
        </Button>
      </div>

      {/* ── Add Note Form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{t('customerRequestedProduct')}</h2>
          <Input
            label={t('productNameEnglish')}
            value={form.productName}
            onChange={(e: any) => setForm({ ...form, productName: e.target.value })}
            required
            placeholder="e.g. Basmati Rice 5kg"
          />
          <Input
            label={t('productNameTamil')}
            value={form.productNameTa}
            onChange={(e: any) => setForm({ ...form, productNameTa: e.target.value })}
            placeholder="e.g. பாஸ்மதி அரிசி"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('notesDescription')}</label>
            <textarea
              className="w-full border border-slate-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t('notesDescriptionPlaceholder')}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button type="submit" isLoading={createMutation.isPending}>{t('saveRequest')}</Button>
          </div>
        </form>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!isLoading && (!requests || requests.length === 0) ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-lg">{t('noRequestsYet')}</p>
            <p className="text-sm mt-1">{t('logNote')} {t('customerAsked').toLowerCase()}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              data={requests || []}
              isLoading={isLoading}
              keyExtractor={(r) => r.id.toString()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestedProducts;
