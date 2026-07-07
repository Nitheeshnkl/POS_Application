import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { getDashboardData, getDailySales, getMonthlySales, getTopProducts, getTargetMetrics } from '../../api/reports';
import { updateSettings } from '../../api/settings';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [newTarget, setNewTarget] = useState<string>('');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardData
  });

  const { data: targetData, isLoading: targetLoading } = useQuery({
    queryKey: ['target-metrics'],
    queryFn: getTargetMetrics
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

  const updateTargetMutation = useMutation({
    mutationFn: (target: number) => updateSettings({ monthly_sales_target: target.toString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-metrics'] });
      setIsTargetModalOpen(false);
    }
  });

  const handleUpdateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newTarget);
    if (val > 0) {
      updateTargetMutation.mutate(val);
    } else {
      alert("Target must be a positive number.");
    }
  };

  const openTargetModal = () => {
    setNewTarget(targetData?.monthlyTarget?.toString() || '150000');
    setIsTargetModalOpen(true);
  };

  if (metricsLoading || targetLoading) return <div className="p-6">Loading dashboard...</div>;

  const today = metrics?.today || {};
  const thisMonth = metrics?.thisMonth || {};

  const paymentModesData = (today.paymentModes || []).map((row: any) => ({
    name: row.paymentMode,
    total: Number(row.total),
  }));

  const proj = targetData?.projection || {};

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* TARGET PROGRESS BAR */}
      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Monthly Sales Target</h2>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-bold text-slate-800">{formatCurrency(targetData?.monthlyTarget || 0)}</span>
              <Button variant="ghost" size="sm" onClick={openTargetModal} className="text-blue-600">
                Edit Target
              </Button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{Math.round(targetData?.progressPercentage || 0)}%</div>
            <p className="text-sm text-gray-500">Progress</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${(targetData?.progressPercentage || 0) >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${Math.min(100, targetData?.progressPercentage || 0)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>{formatCurrency(targetData?.currentMonthSales || 0)} current</span>
          <span>{formatCurrency(targetData?.remainingSales || 0)} remaining</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard title="Current Month Sales" value={formatCurrency(targetData?.currentMonthSales || 0)} color="purple" />
        <MetricCard title="Remaining Sales" value={formatCurrency(targetData?.remainingSales || 0)} color="orange" />
        <MetricCard title="Days Remaining" value={targetData?.daysRemaining} color="gray" />
        <MetricCard title="Required Daily Sales" value={formatCurrency(targetData?.requiredDailySales || 0)} color="red" />
        <MetricCard title="Target Status" value={targetData?.targetStatus} color={targetData?.targetStatus === 'Achieved' || targetData?.targetStatus === 'On Track' ? 'green' : 'red'} />
        
        <MetricCard title="Today's Sales" value={formatCurrency(targetData?.todaySales || 0)} color="blue" />
        <MetricCard title="Today's Target" value={formatCurrency(targetData?.todayTarget || 0)} color="blue" />
        <MetricCard title="Today's Profit" value={formatCurrency(today.profit || 0)} color={today.profit >= 0 ? 'green' : 'red'} />
        <MetricCard title="Est. Month-End Sales" value={formatCurrency(targetData?.estimatedMonthEndSales || 0)} color="purple" />
        <MetricCard title="Total Spent (Month)" value={formatCurrency((thisMonth.purchases || 0) + (thisMonth.expenses || 0))} color="orange" />
      </div>

      {/* PROJECTION & SMART DAILY TARGET */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Smart Daily Target</h2>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Today's Target</span>
              <span className="font-bold">{formatCurrency(proj.today?.target || 0)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Today's Actual Sales</span>
              <span className="font-bold">{formatCurrency(proj.today?.actual || 0)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Today's Status</span>
              <span className="font-bold">
                {proj.today?.status === '✅' ? <span className="text-green-600">✅ Exceeded</span> : <span className="text-orange-500">In Progress</span>}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-gray-600 font-semibold">Tomorrow's Req. Sales</span>
              <span className="font-bold text-blue-600">{formatCurrency(proj.tomorrow?.target || 0)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 italic">
            Missed targets automatically increase remaining daily targets. Exceeded targets decrease them.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Daily Projection Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 rounded-l-md">Day</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3 rounded-r-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium">Yesterday</td>
                  <td className="px-4 py-3">{formatCurrency(proj.yesterday?.target || 0)}</td>
                  <td className="px-4 py-3">{formatCurrency(proj.yesterday?.actual || 0)}</td>
                  <td className="px-4 py-3">
                    {proj.yesterday?.status === '✅' ? <Badge variant="success">✅ Achieved</Badge> : <Badge variant="danger">❌ Behind</Badge>}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors bg-blue-50/30">
                  <td className="px-4 py-3 font-medium text-blue-700">Today</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{formatCurrency(proj.today?.target || 0)}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{formatCurrency(proj.today?.actual || 0)}</td>
                  <td className="px-4 py-3">
                    {proj.today?.status === '✅' ? <Badge variant="success">✅ Achieved</Badge> : <Badge variant="warning">In Progress</Badge>}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors text-slate-400">
                  <td className="px-4 py-3 font-medium">Tomorrow</td>
                  <td className="px-4 py-3">{formatCurrency(proj.tomorrow?.target || 0)}</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">
                    <Badge variant="gray">Upcoming</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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

      {/* Target Edit Modal */}
      <Modal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        title="Set Monthly Sales Target"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsTargetModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTarget} isLoading={updateTargetMutation.isPending}>Save</Button>
          </div>
        }
      >
        <form onSubmit={handleUpdateTarget} className="space-y-4">
          <Input
            label="Monthly Target (₹)"
            type="number"
            min="1"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            required
          />
          <p className="text-sm text-gray-500">
            This target resets every month. Dashboards and daily projections will adjust automatically based on this goal.
          </p>
        </form>
      </Modal>
    </div>
  );
};

const colorMap: Record<string, string> = {
  blue: 'border-blue-500 text-blue-600',
  green: 'border-green-500 text-green-600',
  red: 'border-red-500 text-red-600',
  purple: 'border-purple-500 text-purple-600',
  orange: 'border-orange-500 text-orange-600',
  gray: 'border-gray-500 text-gray-600',
};

const MetricCard = React.memo(({ title, value, color = 'blue' }: { title: string; value: string | number; color?: string }) => (
  <div className={`bg-white p-5 rounded-lg shadow border-t-4 ${colorMap[color].split(' ')[0]}`}>
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 line-clamp-1">{title}</h3>
    <p className={`text-xl font-bold ${colorMap[color].split(' ')[1]}`}>{value}</p>
  </div>
));

export default Dashboard;
