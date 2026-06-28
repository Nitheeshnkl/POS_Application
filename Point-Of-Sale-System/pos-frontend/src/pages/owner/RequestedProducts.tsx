import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestedProducts, updateRequestedProductStatus } from '../../api/requested_products';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/formatDate';

const RequestedProducts: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requested-products'],
    queryFn: getRequestedProducts
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => updateRequestedProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requested-products'] });
    }
  });

  const columns = [
    { header: t('nameEnglish') || 'Name (EN)', accessor: 'productName' as const },
    { header: t('nameTamil') || 'Name (TA)', accessor: 'productNameTa' as const },
    { header: 'Requests', accessor: 'requestedCount' as const },
    { header: 'Notes', accessor: 'notes' as const },
    { header: 'Date', accessor: (r: any) => formatDate(r.createdAt) },
    { 
      header: 'Status', 
      accessor: (r: any) => (
        <Badge variant={r.status === 'requested' ? 'warning' : r.status === 'ordered' ? 'info' : r.status === 'stocked' ? 'success' : 'danger'}>
          {r.status.toUpperCase()}
        </Badge>
      ) 
    },
    {
      header: t('actions') || 'Actions',
      accessor: (r: any) => (
        <div className="flex space-x-2">
          {r.status === 'requested' && (
            <Button size="sm" onClick={() => updateMutation.mutate({ id: r.id, status: 'ordered' })}>
              Order
            </Button>
          )}
          {(r.status === 'requested' || r.status === 'ordered') && (
            <Button size="sm" variant="primary" onClick={() => updateMutation.mutate({ id: r.id, status: 'stocked' })}>
              Stocked
            </Button>
          )}
          {r.status !== 'ignored' && (
            <Button size="sm" variant="danger" onClick={() => updateMutation.mutate({ id: r.id, status: 'ignored' })}>
              Ignore
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('requestedProducts') || 'Customer Request Notes'}</h1>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table 
            columns={columns} 
            data={requests || []} 
            isLoading={isLoading} 
            keyExtractor={(r) => r.id.toString()} 
          />
        </div>
      </div>
    </div>
  );
};

export default RequestedProducts;
