import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, Users, AlertCircle, Receipt, 
  MapPin, Package, FileText, Upload, Settings, UserCheck, Shield, Building2
} from 'lucide-react';

export default function Sidebar() {
  const { user, company } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;

  const adminLinks = [
    { label: t('nav.dashboard', 'Dashboard'), path: '/admin', icon: LayoutDashboard },
    { label: t('nav.customerManagement', 'Customer Management'), path: '/admin/customers', icon: Users },
    { label: t('nav.dueManagement', 'Due Management'), path: '/admin/dues', icon: AlertCircle },
    { label: t('nav.collections', 'Collection History'), path: '/admin/collections', icon: Receipt },
    { label: t('nav.billing', 'Monthly Billing'), path: '/admin/billing', icon: Receipt },
    { label: t('nav.areas', 'Area Management'), path: '/admin/areas', icon: MapPin },
    { label: t('nav.collectors', 'Collector Management'), path: '/admin/collectors', icon: UserCheck },
    { label: t('nav.packages', 'Package Management'), path: '/admin/packages', icon: Package },
    { label: t('nav.reports', 'Reports (12 Types)'), path: '/admin/reports', icon: FileText },
    { label: t('nav.import', 'Bulk Customer Import'), path: '/admin/import', icon: Upload },
    { label: t('nav.settings', 'Company Settings'), path: '/admin/settings', icon: Settings },
  ];

  const collectorLinks = [
    { label: t('nav.collectorDashboard', 'Collector Dashboard'), path: '/collector', icon: LayoutDashboard },
    { label: t('nav.myCustomers', 'My Area Customers'), path: '/collector/customers', icon: Users },
    { label: t('nav.myCollections', 'My Collection History'), path: '/collector/collections', icon: Receipt },
  ];

  const superAdminLinks = [
    { label: t('nav.superadminOverview', 'Platform Overview'), path: '/superadmin', icon: LayoutDashboard },
    { label: t('nav.superadminCompanies', 'Company Management'), path: '/superadmin/companies', icon: Users },
    { label: t('nav.superadminSettings', 'Platform Settings'), path: '/superadmin/settings', icon: Settings },
  ];

  const customerLinks = [
    { label: t('nav.myAccount', 'My Account & Bills'), path: '/customer', icon: LayoutDashboard },
  ];

  let links = [];
  if (user.role === 'company_admin') links = adminLinks;
  else if (user.role === 'collector') links = collectorLinks;
  else if (user.role === 'super_admin') links = superAdminLinks;
  else if (user.role === 'customer') links = customerLinks;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-800 no-print shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold truncate">
            {company?.name || user.role.replace('_', ' ')}
          </div>
          <div className="text-sm font-bold text-white truncate">
            {user.name}
          </div>
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
