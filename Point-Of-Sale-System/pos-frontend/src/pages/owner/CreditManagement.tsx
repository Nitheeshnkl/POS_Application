import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, updateCustomer } from '../../api/customers';
import { getSuppliers, updateSupplier } from '../../api/suppliers';
import { getUsers, updateUser } from '../../api/users';
import { Table } from '../../components/ui/Table';

const CreditManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'cashiers'>('customers');
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: cashiers = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const updateCustLimit = useMutation({
    mutationFn: (data: any) => updateCustomer(data.id, { credit_limit: data.limit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
  });

  const updateSupLimit = useMutation({
    mutationFn: (data: any) => updateSupplier(data.id, { credit_limit: data.limit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  });

  const updateCashierLimit = useMutation({
    mutationFn: (data: any) => updateUser(data.id, { credit_limit: data.limit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  const handleUpdateLimit = (id: string, currentLimit: number, type: 'customer'|'supplier'|'cashier') => {
    const newLimit = prompt('Enter new credit limit:', currentLimit.toString());
    if (newLimit !== null && !isNaN(Number(newLimit))) {
      if (type === 'customer') updateCustLimit.mutate({ id, limit: Number(newLimit) });
      if (type === 'supplier') updateSupLimit.mutate({ id, limit: Number(newLimit) });
      if (type === 'cashier') updateCashierLimit.mutate({ id, limit: Number(newLimit) });
    }
  };

  const customerColumns = [
    { header: 'Name', accessor: (c: any) => c.name },
    { header: 'Phone', accessor: (c: any) => c.phone },
    { header: 'Credit Limit', accessor: (c: any) => `₹${c.credit_limit || 0}` },
    { header: 'Credit Used', accessor: (c: any) => `₹${c.credit_used || 0}` },
    { header: 'Available', accessor: (c: any) => `₹${Number(c.credit_limit || 0) - Number(c.credit_used || 0)}` },
    { header: 'Actions', accessor: (c: any) => <button onClick={() => handleUpdateLimit(c.id, c.credit_limit || 0, 'customer')} className="text-blue-600 font-medium">Edit Limit</button> }
  ];

  const supplierColumns = [
    { header: 'Name', accessor: (s: any) => s.name },
    { header: 'Phone', accessor: (s: any) => s.phone },
    { header: 'Credit Limit', accessor: (s: any) => `₹${s.credit_limit || 0}` },
    { header: 'Balance (Due)', accessor: (s: any) => `₹${s.balance || 0}` },
    { header: 'Available', accessor: (s: any) => `₹${Number(s.credit_limit || 0) - Number(s.balance || 0)}` },
    { header: 'Actions', accessor: (s: any) => <button onClick={() => handleUpdateLimit(s.id, s.credit_limit || 0, 'supplier')} className="text-blue-600 font-medium">Edit Limit</button> }
  ];

  const cashierColumns = [
    { header: 'Name', accessor: (u: any) => u.name },
    { header: 'Username', accessor: (u: any) => u.username },
    { header: 'Credit Limit', accessor: (u: any) => `₹${u.credit_limit || 0}` },
    { header: 'Credit Used', accessor: (u: any) => `₹${u.credit_used || 0}` },
    { header: 'Available', accessor: (u: any) => `₹${Number(u.credit_limit || 0) - Number(u.credit_used || 0)}` },
    { header: 'Actions', accessor: (u: any) => <button onClick={() => handleUpdateLimit(u.id, u.credit_limit || 0, 'cashier')} className="text-blue-600 font-medium">Edit Limit</button> }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Credit Management</h1>
        <p className="text-slate-500">Manage credit limits and view dues for customers, suppliers, and cashiers.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {(['customers', 'suppliers', 'cashiers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 capitalize font-medium ${
              activeTab === tab ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'customers' && (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <Table columns={customerColumns} data={customers} keyExtractor={(c: any) => c.id} />
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <Table columns={supplierColumns} data={suppliers} keyExtractor={(s: any) => s.id} />
        </div>
      )}

      {activeTab === 'cashiers' && (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <Table columns={cashierColumns} data={cashiers} keyExtractor={(u: any) => u.id} />
        </div>
      )}
    </div>
  );
};

export default CreditManagement;
