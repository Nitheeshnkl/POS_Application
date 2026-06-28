import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenses, createExpense, getMonthlyExpenses, updateExpense } from '../../api/expenses';
import { Expense } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';

const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    category: ''
  });

  const [formData, setFormData] = useState<Partial<Expense>>({
    category: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'cash'
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => getExpenses(filters)
  });

  const { data: monthlySummary } = useQuery({
    queryKey: ['expenses-monthly', filters],
    queryFn: () => getMonthlyExpenses(filters)
  });

  // Compute total directly from visible rows as a reliable fallback
  const tableTotal = (expenses || []).reduce((sum: number, e: Expense) => sum + Number(e.amount || 0), 0);
  const displayTotal = (monthlySummary as any)?.totalThisMonth ?? tableTotal;

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      toast.success('Expense created successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-monthly'] });
      setIsModalOpen(false);
      setFormData({
        category: '',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'cash'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Expense>) => updateExpense(Number(data.id), data),
    onSuccess: () => {
      toast.success('Expense updated successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-monthly'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  });

  const columns = [
    { header: 'Date', accessor: (exp: Expense) => formatDate(exp.date) },
    { header: 'Category', accessor: 'category' as keyof Expense },
    { header: 'Description', accessor: 'description' as keyof Expense },
    { header: 'Amount', accessor: (exp: Expense) => formatCurrency(exp.amount) },
    { header: 'Payment Mode', accessor: 'paymentMode' as keyof Expense },
    { header: 'Actions', accessor: (exp: Expense) => <Button size="sm" onClick={() => { setFormData(exp); setIsModalOpen(true); }}>Edit</Button> }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      updateMutation.mutate(formData as any);
    } else {
      createMutation.mutate(formData as any);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Button onClick={() => { 
          setFormData({
            category: '',
            description: '',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'cash'
          });
          setIsModalOpen(true); 
        }}>Add Expense</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Expenses</h3>
          <p className="text-2xl font-bold">{formatCurrency(displayTotal)}</p>
          {(expenses || []).length > 0 && (
            <p className="text-xs text-slate-400 mt-1">{(expenses || []).length} record{(expenses || []).length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          />
          <Input
            type="date"
            label="End Date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          />
          <Input
            label="Category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          />
        </div>
      </div>

      <div className="hidden md:block">
        <Table columns={columns} data={expenses || []} isLoading={isLoading} keyExtractor={(e) => e.id} />
      </div>

      <div className="md:hidden space-y-4">
        {isLoading && <div className="text-center py-4">Loading expenses...</div>}
        {!isLoading && expenses?.map(exp => (
          <div key={exp.id} className="bg-white p-4 rounded-lg shadow flex flex-col gap-2">
            <div className="flex justify-between font-bold text-lg">
              <span>{exp.category}</span>
              <span>{formatCurrency(exp.amount)}</span>
            </div>
            <div className="text-sm text-slate-500">{exp.description}</div>
            <div className="flex justify-between text-sm items-center mt-2">
              <span>{formatDate(exp.date)} - {exp.paymentMode}</span>
              <Button size="sm" onClick={() => { setFormData(exp); setIsModalOpen(true); }}>Edit</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? "Edit Expense" : "Add Expense"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category"
            value={formData.category}
            onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
            required
            placeholder="e.g., Rent, Electricity, Tea"
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <Input
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e: any) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={formData.date?.split('T')[0]}
            onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
            <select
              className="w-full border rounded-md p-2"
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
