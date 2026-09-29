import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, AlertCircle, Receipt, 
  MapPin, Package, FileText, Upload, Settings, UserCheck, Shield
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const adminLinks = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Customer Management', path: '/admin/customers', icon: Users },
    { label: 'Due Management', path: '/admin/dues', icon: AlertCircle },
    { label: 'Collection History', path: '/admin/collections', icon: Receipt },
    { label: 'Monthly Billing', path: '/admin/billing', icon: Receipt },
    { label: 'Area Management', path: '/admin/areas', icon: MapPin },
    { label: 'Collector Management', path: '/admin/collectors', icon: UserCheck },
    { label: 'Package Management', path: '/admin/packages', icon: Package },
    { label: 'Reports (12 Types)', path: '/admin/reports', icon: FileText },
    { label: 'Bulk Customer Import', path: '/admin/import', icon: Upload },
    { label: 'Company Settings', path: '/admin/settings', icon: Settings },
  ];

  const collectorLinks = [
    { label: 'Collector Dashboard', path: '/collector', icon: LayoutDashboard },
    { label: 'My Area Customers', path: '/collector/customers', icon: Users },
    { label: 'My Collection History', path: '/collector/collections', icon: Receipt },
  ];

  const superAdminLinks = [
    { label: 'Platform Overview', path: '/superadmin', icon: LayoutDashboard },
    { label: 'Company Management', path: '/superadmin/companies', icon: Users },
    { label: 'Platform Settings', path: '/superadmin/settings', icon: Settings },
  ];

  const customerLinks = [
    { label: 'My Account & Bills', path: '/customer', icon: LayoutDashboard },
  ];

  let links = [];
  if (user.role === 'company_admin') links = adminLinks;
  else if (user.role === 'collector') links = collectorLinks;
  else if (user.role === 'super_admin') links = superAdminLinks;
  else if (user.role === 'customer') links = customerLinks;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-800 no-print shrink-0">
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
          {user.role.replace('_', ' ')}
        </div>
        <div className="text-sm font-medium text-white truncate">
          {user.name}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/collector' || item.path === '/superadmin' || item.path === '/customer'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
