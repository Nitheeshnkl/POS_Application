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
  Receipt
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const ownerLinks = [
    { to: '/owner', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/owner/billing', icon: <Receipt size={20} />, label: 'Billing' },
    { to: '/owner/products', icon: <Package size={20} />, label: 'Products' },
    { to: '/owner/categories', icon: <Tags size={20} />, label: 'Categories' },
    { to: '/owner/purchases', icon: <ShoppingCart size={20} />, label: 'Purchases' },
    { to: '/owner/stock-movements', icon: <History size={20} />, label: 'Stock History' },
    { to: '/owner/expenses', icon: <TrendingUp size={20} />, label: 'Expenses' },
    { to: '/owner/reports', icon: <TrendingUp size={20} />, label: 'Reports' },
    { to: '/owner/cashiers', icon: <Users size={20} />, label: 'Cashiers' },
    { to: '/owner/audit-logs', icon: <ClipboardList size={20} />, label: 'Audit Logs' },
    { to: '/owner/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const cashierLinks = [
    { to: '/cashier', icon: <Receipt size={20} />, label: 'Billing' },
    { to: '/cashier/my-bills', icon: <History size={20} />, label: 'My Bills' },
    { to: '/cashier/stock-view', icon: <Package size={20} />, label: 'Stock View' },
  ];

  const links = user?.role === 'owner' ? ownerLinks : cashierLinks;

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-slate-700">
        SMS POS
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-700 text-slate-300'
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
