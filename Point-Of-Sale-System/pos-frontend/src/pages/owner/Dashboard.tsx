import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getDashboardData, getDailySales, getMonthlySales, getTopProducts } from '../../api/reports';
import { formatCurrency } from '../../utils/formatCurrency';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardData
  });

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: () => getDailySales(30)
  });

  const { data: monthlySales } = useQuery({
    queryKey: ['monthly-sales'],
    queryFn: () => getMonthlySales(12)
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => getTopProducts({ limit: 10 })
  });

  if (metricsLoading) return <div className="p-6">Loading dashboard...</div>;

  const today = metrics?.today || {};
  const thisMonth = metrics?.thisMonth || {};

  const paymentModesData = (today.paymentModes || []).map((row: any) => ({
    name: row.paymentMode,
    total: Number(row.total),
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Today's Sales" value={formatCurrency(today.sales || 0)} color="blue" />
        <MetricCard title="Today's Bills" value={today.bills || 0} color="green" />
        <MetricCard title="Today's Profit" value={formatCurrency(today.profit || 0)} color={today.profit >= 0 ? 'green' : 'red'} />
        <MetricCard title="Monthly Sales" value={formatCurrency(thisMonth.sales || 0)} color="purple" />
      </div>

      <h2 className="text-xl font-bold mb-4">Investment vs Profit (This Month)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Purchases (Stock)" value={formatCurrency(thisMonth.purchases || 0)} color="orange" />
        <MetricCard title="Other Expenses" value={formatCurrency(thisMonth.expenses || 0)} color="orange" />
        <MetricCard title="Total Spent" value={formatCurrency((thisMonth.purchases || 0) + (thisMonth.expenses || 0))} color="red" />
        <MetricCard title="Net Profit" value={formatCurrency(thisMonth.profit || 0)} color={(thisMonth.profit || 0) >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Daily Sales (Last 30 Days)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="total" fill="#0088FE" name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Monthly Sales (Last 12 Months)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line type="monotone" dataKey="total" stroke="#8884d8" name="Sales" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Top 10 Products by Quantity</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nameEn" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="totalQtySold" fill="#00C49F" name="Qty Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Payment Modes (Today)</h2>
          <div className="h-80">
            {paymentModesData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                No sales today yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="name"
                  >
                    {paymentModesData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginTop: '32px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Top Selling Products</h2>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Last 30 days</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['#', 'Product', 'Units Sold', 'Revenue', 'Stock'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(topProducts || []).map((p: any, i: number) => (
              <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{p.nameEn}</span>
                  {p.nameTa && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '6px' }}>{p.nameTa}</span>}
                </td>
                <td style={{ padding: '12px 16px', color: '#111827' }}>{p.totalQtySold}</td>
                <td style={{ padding: '12px 16px', color: '#111827' }}>₹{Number(p.totalRevenue).toFixed(2)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: p.needsRestock ? '#fef2f2' : '#f0fdf4', color: p.needsRestock ? '#b91c1c' : '#166534' }}>
                    {p.currentStock} {p.needsRestock ? '⚠ Restock' : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
            {(topProducts || []).length === 0 && (
              <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No sales data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const colorMap: Record<string, string> = {
  blue: 'border-blue-500',
  green: 'border-green-500',
  red: 'border-red-500',
  purple: 'border-purple-500',
};

const MetricCard = ({ title, value, color = 'blue' }: { title: string; value: string | number; color?: string }) => (
  <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${colorMap[color] || 'border-blue-500'}`}>
    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export default Dashboard;
