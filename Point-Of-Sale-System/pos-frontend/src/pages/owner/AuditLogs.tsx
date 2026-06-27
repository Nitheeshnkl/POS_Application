import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../utils/formatDate';

const AuditLogs: React.FC = () => {
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    page: 1,
    limit: 20
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const response = await api.get('/audit-logs', { params: filters });
      return response.data;
    }
  });

  const columns = [
    { header: 'Timestamp', accessor: (v: any) => formatDate(v.createdAt) },
    { header: 'Action', accessor: 'action' },
    { header: 'Table', accessor: 'tableName' },
    { header: 'Performed By', accessor: 'performedBy' },
    { header: 'Details', accessor: (v: any) => <span className="text-xs font-mono">{JSON.stringify(v.details)}</span> }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Filter by Action"
            value={filters.action}
            onChange={e => setFilters({ ...filters, action: e.target.value, page: 1 })}
            placeholder="e.g., CREATE, UPDATE, DELETE"
          />
          <Input
            label="Filter by User"
            value={filters.user}
            onChange={e => setFilters({ ...filters, user: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.logs || []}
        isLoading={isLoading}
        keyExtractor={(l: any) => l.id}
      />

      {data?.totalPages > 1 && (
        <div className="mt-4 flex justify-center space-x-2">
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {filters.page} of {data.totalPages}</span>
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            disabled={filters.page === data.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
