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
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="totalQty" fill="#00C49F" name="Qty Sold" />
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
