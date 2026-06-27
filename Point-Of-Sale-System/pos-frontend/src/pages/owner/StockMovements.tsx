import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStockMovements } from '../../api/stock';
import { getProducts } from '../../api/products';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { StockMovement } from '../../types';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

const StockMovements: React.FC = () => {
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['stockMovements', page, productId],
    queryFn: () => getStockMovements({ page, limit, product_id: productId || undefined }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ is_active: true }),
  });

  const movements = data?.movements || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getBadgeVariant = (type: StockMovement['type']): 'success' | 'warning' | 'danger' | 'info' | 'gray' => {
    switch (type) {
      case 'purchase': return 'success';
      case 'sale': return 'info';
      case 'adjustment': return 'warning';
      case 'damaged': return 'danger';
      case 'initial': return 'gray';
      default: return 'gray';
    }
  };

  const columns = [
    {
      header: 'Product',
      accessor: (m: StockMovement) => (
        <div>
          <div className="font-medium">{m.product?.nameEn}</div>
          <div className="text-xs text-slate-500">{m.product?.nameTa}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (m: StockMovement) => (
        <Badge variant={getBadgeVariant(m.type)} className="capitalize">
          {m.type}
        </Badge>
      ),
    },
    {
      header: 'Quantity',
      accessor: (m: StockMovement) => (
        <span className={m.qty > 0 ? 'text-green-600' : 'text-red-600'}>
          {m.qty > 0 ? `+${m.qty}` : m.qty}
        </span>
      ),
    },
    {
      header: 'Unit Price',
      accessor: (m: StockMovement) => m.unitPrice ? formatCurrency(m.unitPrice) : '-',
    },
    {
      header: 'Performed By',
      accessor: (m: StockMovement) => m.user?.name || 'System',
    },
    {
      header: 'Date',
      accessor: (m: StockMovement) => formatDate(m.createdAt),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Stock Movements</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nameEn}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={movements}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
      />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovements;
