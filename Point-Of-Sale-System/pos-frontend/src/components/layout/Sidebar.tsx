import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  History,
  TrendingUp,
  Users,
  ClipboardList,
  Settings,
  Receipt,
  Truck,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../i18n/LanguageContext';

const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { t } = useLanguage();

  const ownerLinks = [
    { to: '/owner', icon: <LayoutDashboard size={20} />, label: t('dashboard'), end: true },
    { to: '/owner/billing', icon: <Receipt size={20} />, label: t('billing') },
    { to: '/owner/products', icon: <Package size={20} />, label: t('products') },
    { to: '/owner/categories', icon: <Tags size={20} />, label: t('categories') },
    { to: '/owner/suppliers', icon: <Truck size={20} />, label: t('supplier') },
    { to: '/owner/purchases', icon: <ShoppingCart size={20} />, label: t('purchases') },
    { to: '/owner/stock-movements', icon: <History size={20} />, label: t('stockHistory') },
    { to: '/owner/expenses', icon: <TrendingUp size={20} />, label: t('expenses') },
    { to: '/owner/reports', icon: <BookOpen size={20} />, label: t('reports') },
    { to: '/owner/export-center', icon: <BookOpen size={20} />, label: 'Export Center' },
    { to: '/owner/requested-products', icon: <ClipboardList size={20} />, label: t('requestedProducts') || 'Requested Products' },
    { to: '/owner/cashout', icon: <DollarSign size={20} />, label: t('cashDrawer') },
    { to: '/owner/cashout-history', icon: <DollarSign size={20} />, label: t('cashoutHistory') },
    { to: '/owner/cashiers', icon: <Users size={20} />, label: t('cashiers') },
    { to: '/owner/audit-logs', icon: <ClipboardList size={20} />, label: t('auditLogs') },
    { to: '/owner/settings', icon: <Settings size={20} />, label: t('settings') },
  ];

  const cashierLinks = [
    { to: '/cashier', icon: <Receipt size={20} />, label: t('billing'), end: true },
    { to: '/cashier/my-bills', icon: <History size={20} />, label: t('myBills') },
    { to: '/cashier/stock-view', icon: <Package size={20} />, label: t('stockView') },
  ];

  const links = user?.role === 'owner' ? ownerLinks : cashierLinks;

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-slate-700">
        SMS POS
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
