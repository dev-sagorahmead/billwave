import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Tv, LogOut, User, Shield, Building2, Wallet, 
  ChevronDown, RefreshCw, Smartphone, Check
} from 'lucide-react';

export default function Header() {
  const { user, company, logout, demoSwitch } = useAuth();
  const navigate = useNavigate();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (role, email) => {
    try {
      setSwitching(true);
      setShowSwitchMenu(false);
      await demoSwitch(role, email);
      navigate('/');
    } catch (err) {
      alert('Failed to switch: ' + err.message);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Shield className="w-3 h-3" /> Super Admin</span>;
      case 'company_admin':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Building2 className="w-3 h-3" /> Company Admin</span>;
      case 'collector':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Wallet className="w-3 h-3" /> Bill Collector</span>;
      case 'customer':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><User className="w-3 h-3" /> Customer</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand & Company Details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                  {company ? company.name : 'DishBilling Cloud'}
                </span>
                {user && getRoleBadge(user.role)}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {user?.role === 'collector' && user.assignedAreas?.length > 0 ? (
                  <span>Assigned: {user.assignedAreas.map(a => a.name).join(', ')}</span>
                ) : company?.phone ? (
                  <span>Support: {company.phone}</span>
                ) : (
                  <span>Multi-Tenant Cable TV Platform</span>
                )}
              </p>
            </div>
          </div>

          {/* Right actions: Demo Quick Switcher & User */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Quick Role Switcher for Demo & Evaluation */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
                title="Quick switch roles to test full multi-tenant capabilities"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${switching ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Switch Role Demo</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showSwitchMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Role Switcher
                  </div>

                  <button
                    onClick={() => handleRoleSwitch('super_admin')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-purple-900 group-hover:text-purple-700">1. Super Admin</div>
                      <div className="text-slate-500 text-[11px]">Control all companies & platform</div>
                    </div>
                    {user?.role === 'super_admin' && <Check className="w-4 h-4 text-purple-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('company_admin', 'admin@dhakasky.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-blue-900 group-hover:text-blue-700">2. Company Admin (Dhaka Sky)</div>
                      <div className="text-slate-500 text-[11px]">Full control of Dhaka Sky company</div>
                    </div>
                    {user?.email === 'admin@dhakasky.com' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('company_admin', 'admin@ctgdigital.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-sky-900 group-hover:text-sky-700">2b. Company Admin (Chittagong)</div>
                      <div className="text-slate-500 text-[11px]">Tests strict tenant isolation</div>
                    </div>
                    {user?.email === 'admin@ctgdigital.com' && <Check className="w-4 h-4 text-sky-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('collector', 'kamal@dhakasky.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-emerald-900 group-hover:text-emerald-700">3. Collector (Kamal - Mirpur)</div>
                      <div className="text-slate-500 text-[11px]">Only Mirpur area customers</div>
                    </div>
                    {user?.email === 'kamal@dhakasky.com' && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('collector', 'tariq@dhakasky.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-emerald-900 group-hover:text-emerald-700">3b. Collector (Tariq - Mohammadpur)</div>
                      <div className="text-slate-500 text-[11px]">Mohammadpur & Dhanmondi areas</div>
                    </div>
                    {user?.email === 'tariq@dhakasky.com' && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('customer')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-amber-900 group-hover:text-amber-700">4. Customer Portal (DSN-000001)</div>
                      <div className="text-slate-500 text-[11px]">View bill, payments, dues & receipts</div>
                    </div>
                    {user?.role === 'customer' && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-500">{user?.email}</div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
