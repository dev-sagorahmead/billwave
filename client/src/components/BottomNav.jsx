import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, AlertCircle, Receipt, 
  Menu, X, MapPin, Package, FileText, Upload, Settings, UserCheck, PlusCircle
} from 'lucide-react';

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  // More menu items for Company Admin
  const adminMoreItems = [
    { label: 'Area Management', path: '/admin/areas', icon: MapPin },
    { label: 'Collector Management', path: '/admin/collectors', icon: UserCheck },
    { label: 'Package Management', path: '/admin/packages', icon: Package },
    { label: 'Monthly Billing Generator', path: '/admin/billing', icon: Receipt },
    { label: '12 Comprehensive Reports', path: '/admin/reports', icon: FileText },
    { label: 'Bulk Customer Import (Excel/CSV)', path: '/admin/import', icon: Upload },
    { label: 'Company Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg md:hidden bottom-nav pb-safe">
        <div className="flex justify-around items-center h-16 px-1">
          
          {/* Company Admin Navigation */}
          {user.role === 'company_admin' && (
            <>
              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/admin') ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}
              >
                <LayoutDashboard className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin/customers'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/admin/customers') ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Customers</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin/dues'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/admin/dues') ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}
              >
                <AlertCircle className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Due List</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin/collections'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/admin/collections') ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}
              >
                <Receipt className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Collections</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${showMoreMenu ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}
              >
                <Menu className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">More</span>
              </button>
            </>
          )}

          {/* Collector Navigation */}
          {user.role === 'collector' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/collector')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/collector') ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}
              >
                <LayoutDashboard className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/collector/customers')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/collector/customers') ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">My Customers</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/collector/collections')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/collector/collections') ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}
              >
                <Receipt className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">My Collections</span>
              </button>
            </>
          )}

          {/* Super Admin Navigation */}
          {user.role === 'super_admin' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/superadmin')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/superadmin') ? 'text-purple-600 font-semibold' : 'text-slate-500'}`}
              >
                <LayoutDashboard className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">Overview</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/superadmin/companies')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/superadmin/companies') ? 'text-purple-600 font-semibold' : 'text-slate-500'}`}
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">Companies</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/superadmin/settings')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/superadmin/settings') ? 'text-purple-600 font-semibold' : 'text-slate-500'}`}
              >
                <Settings className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">Settings</span>
              </button>
            </>
          )}

          {/* Customer Navigation */}
          {user.role === 'customer' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/customer')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${isActive('/customer') ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}
              >
                <LayoutDashboard className="w-5 h-5 mb-0.5" />
                <span className="text-[11px]">My Portal</span>
              </button>
            </>
          )}

        </div>
      </nav>

      {/* Admin "More" Drawer for Mobile */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm md:hidden flex flex-col justify-end animate-in fade-in">
          <div className="bg-white rounded-t-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Management Menu</span>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              {adminMoreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate(item.path);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isActive(item.path)
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-1 text-blue-600" />
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
