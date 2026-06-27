import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCashouts } from '../../api/cashouts';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Badge } from '../../components/ui/Badge';

const CashoutHistory: React.FC = () => {
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const { data: cashouts, isLoading } = useQuery({
    queryKey: ['cashouts', filters],
    queryFn: () => getCashouts({ start_date: filters.start_date, end_date: filters.end_date }),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Cashout History</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            type="date"
            label="Start Date"
            value={filters.start_date}
            onChange={e => setFilters({ ...filters, start_date: e.target.value })}
          />
          <Input
            type="date"
            label="End Date"
            value={filters.end_date}
            onChange={e => setFilters({ ...filters, end_date: e.target.value })}
          />
        </div>
      </div>

      <Table
        columns={[
          { header: 'Date', accessor: (v: any) => formatDate(v.cashoutDate) },
          { header: 'Cashier', accessor: 'cashierName' },
          { header: 'Expected Cash', accessor: (v: any) => formatCurrency(v.expectedCash) },
          { header: 'Actual Cash', accessor: (v: any) => v.actualCash != null ? formatCurrency(v.actualCash) : '—' },
          {
            header: 'Difference',
            accessor: (v: any) => {
              if (v.cashDifference == null) return '—';
              const diff = Number(v.cashDifference);
              const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600';
              return (
                <span className={color}>
                  {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                </span>
              );
            }
          },
          {
            header: 'UPI',
            accessor: (v: any) => formatCurrency(v.expectedUpi),
          },
          {
            header: 'Card',
            accessor: (v: any) => formatCurrency(v.expectedCard),
          },
          {
            header: 'Status',
            accessor: (v: any) => (
              <Badge variant={v.status === 'closed' ? 'success' : 'warning'}>
                {v.status}
              </Badge>
            ),
          },
          {
            header: 'Closed At',
            accessor: (v: any) =>
              v.closedAt ? new Date(v.closedAt).toLocaleTimeString() : '—',
          },
        ]}
        data={cashouts || []}
        isLoading={isLoading}
        keyExtractor={(v: any) => v.id}
      />
    </div>
  );
};

export default CashoutHistory;
