import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getSalesReport,
  getStockReport,
  getPurchasesReport,
  getProfitLossReport,
  getGstReport,
  getCashierPerformance
} from '../../api/reports';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    end_date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', filters],
    queryFn: () => getSalesReport({ start_date: filters.start_date, end_date: filters.end_date }),
    enabled: activeTab === 'sales'
  });

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['report-stock'],
    queryFn: getStockReport,
    enabled: activeTab === 'stock'
  });

  const { data: purchaseData, isLoading: purchaseLoading } = useQuery({
    queryKey: ['report-purchases', filters],
    queryFn: () => getPurchasesReport({ start_date: filters.start_date, end_date: filters.end_date }),
    enabled: activeTab === 'purchases'
  });

  const { data: plData } = useQuery({
    queryKey: ['report-pl', filters.month, filters.year],
    queryFn: () => getProfitLossReport(filters.month, filters.year),
    enabled: activeTab === 'pl'
  });

  const { data: gstData, isLoading: gstLoading } = useQuery({
    queryKey: ['report-gst', filters.month, filters.year],
    queryFn: () => getGstReport(filters.month, filters.year),
    enabled: activeTab === 'gst'
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['report-performance', filters],
    queryFn: () => getCashierPerformance({ start_date: filters.start_date, end_date: filters.end_date }),
    enabled: activeTab === 'performance'
  });

  const exportToCSV = (data: any[], fileName: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'sales', label: 'Sales' },
    { id: 'stock', label: 'Stock Valuation' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'pl', label: 'Profit & Loss' },
    { id: 'gst', label: 'GST Report' },
    { id: 'performance', label: 'Cashier Performance' }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="flex border-b mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {['sales', 'purchases', 'performance'].includes(activeTab) && (
            <>
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
            </>
          )}
          {['pl', 'gst'].includes(activeTab) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={filters.month}
                  onChange={e => setFilters({ ...filters, month: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <Input
                type="number"
                label="Year"
                value={filters.year}
                onChange={e => setFilters({ ...filters, year: parseInt(e.target.value) })}
              />
            </>
          )}
          <div className="md:col-start-4 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                const data = activeTab === 'sales' ? salesData :
                             activeTab === 'stock' ? stockData :
                             activeTab === 'purchases' ? purchaseData :
                             activeTab === 'performance' ? performanceData : [];
                exportToCSV(data, `${activeTab}-report`);
              }}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {activeTab === 'sales' && (
        <Table
          columns={[
            { header: 'Bill No', accessor: 'billNumber' },
            { header: 'Date', accessor: (v: any) => formatDate(v.createdAt) },
            { header: 'Cashier', accessor: 'cashierName' },
            { header: 'Payment', accessor: 'paymentMode' },
            { header: 'Amount', accessor: (v: any) => formatCurrency(v.totalAmount) }
          ]}
          data={salesData || []}
          isLoading={salesLoading}
          keyExtractor={(v: any) => v.id}
        />
      )}

      {activeTab === 'stock' && (
        <Table
          columns={[
            { header: 'Product', accessor: 'name' },
            { header: 'Category', accessor: 'category' },
            { header: 'Current Stock', accessor: 'stock' },
            { header: 'Unit', accessor: 'unit' },
            { header: 'Purchase Price', accessor: (v: any) => formatCurrency(v.purchasePrice) },
            { header: 'Stock Value', accessor: (v: any) => formatCurrency(v.value) }
          ]}
          data={stockData || []}
          isLoading={stockLoading}
          keyExtractor={(v: any) => v.id || v.name}
        />
      )}

      {activeTab === 'purchases' && (
        <Table
          columns={[
            { header: 'Supplier', accessor: 'supplierName' },
            { header: 'Date', accessor: (v: any) => formatDate(v.purchaseDate) },
            { header: 'Invoice', accessor: 'invoiceNumber' },
            { header: 'Total', accessor: (v: any) => formatCurrency(v.totalAmount) }
          ]}
          data={purchaseData || []}
          isLoading={purchaseLoading}
          keyExtractor={(v: any) => v.id}
        />
      )}

      {activeTab === 'pl' && plData && (
        <div className="bg-white p-6 rounded-lg shadow max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Profit & Loss Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between"><span>Revenue:</span><span className="font-bold text-green-600">{formatCurrency(plData.revenue)}</span></div>
            <div className="flex justify-between"><span>COGS:</span><span className="font-bold text-red-600">-{formatCurrency(plData.cogs)}</span></div>
            <div className="flex justify-between border-t pt-2"><span>Gross Profit:</span><span className="font-bold">{formatCurrency(plData.grossProfit)}</span></div>
            <div className="flex justify-between text-red-600"><span>Expenses:</span><span>-{formatCurrency(plData.expenses)}</span></div>
            <div className="flex justify-between border-t-2 pt-2 text-xl"><span>Net Profit:</span><span className={`font-bold ${plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(plData.netProfit)}</span></div>
          </div>
        </div>
      )}

      {activeTab === 'gst' && (
        <Table
          columns={[
            { header: 'GST Rate', accessor: (v: any) => `${v.rate}%` },
            { header: 'Taxable Amount', accessor: (v: any) => formatCurrency(v.taxableAmount) },
            { header: 'CGST', accessor: (v: any) => formatCurrency(v.cgst) },
            { header: 'SGST', accessor: (v: any) => formatCurrency(v.sgst) },
            { header: 'Total GST', accessor: (v: any) => formatCurrency(v.totalGst) }
          ]}
          data={gstData || []}
          isLoading={gstLoading}
          keyExtractor={(v: any) => v.rate}
        />
      )}

      {activeTab === 'performance' && (
        <Table
          columns={[
            { header: 'Cashier Name', accessor: 'name' },
            { header: 'Bills Count', accessor: 'billCount' },
            { header: 'Total Sales', accessor: (v: any) => formatCurrency(v.totalSales) }
          ]}
          data={performanceData || []}
          isLoading={performanceLoading}
          keyExtractor={(v: any) => v.name}
        />
      )}
    </div>
  );
};

export default Reports;
