import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, Users, AlertCircle, Receipt, 
  Menu, X, MapPin, Package, FileText, Upload, Settings, UserCheck, PlusCircle
} from 'lucide-react';

export default function BottomNav() {
  const { user } = useAuth();
  const { t, isBn } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  // More menu items for Company Admin with distinct colors
  const adminMoreItems = [
    { label: t('nav.areas', 'Area Management'), path: '/admin/areas', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    { label: t('nav.collectors', 'Collector Management'), path: '/admin/collectors', icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { label: t('nav.packages', 'Package Management'), path: '/admin/packages', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: t('nav.billing', 'Monthly Billing Generator'), path: '/admin/billing', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: t('nav.reports', '12 Comprehensive Reports'), path: '/admin/reports', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: t('nav.import', 'Bulk Customer Import'), path: '/admin/import', icon: Upload, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
    { label: t('nav.settings', 'Company Settings'), path: '/admin/settings', icon: Settings, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Native App Style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden bottom-nav pb-safe">
        <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
          
          {/* Company Admin Navigation */}
          {user.role === 'company_admin' && (
            <>
              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/admin') ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/admin') ? 'bg-blue-50' : ''}`}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{t('nav.dashboard', 'Dashboard')}</span>
                {isActive('/admin') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin/customers'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/admin/customers') ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/admin/customers') ? 'bg-blue-50' : ''}`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{t('nav.customers', 'Customers')}</span>
                {isActive('/admin/customers') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin/dues'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/admin/dues') ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/admin/dues') ? 'bg-rose-50' : ''}`}>
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{t('nav.dues', 'Due List')}</span>
                {isActive('/admin/dues') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-rose-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { setShowMoreMenu(false); navigate('/admin/collections'); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/admin/collections') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/admin/collections') ? 'bg-emerald-50' : ''}`}>
                  <Receipt className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{t('nav.collections', 'Collections')}</span>
                {isActive('/admin/collections') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  showMoreMenu ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${showMoreMenu ? 'bg-blue-50' : ''}`}>
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{t('nav.more', 'More')}</span>
                {showMoreMenu && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            </>
          )}

          {/* Collector Navigation */}
          {user.role === 'collector' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/collector')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/collector') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/collector') ? 'bg-emerald-50' : ''}`}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{t('nav.dashboard', 'Dashboard')}</span>
                {isActive('/collector') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/collector/customers')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/collector/customers') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/collector/customers') ? 'bg-emerald-50' : ''}`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{t('nav.myCustomers', 'My Customers')}</span>
                {isActive('/collector/customers') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/collector/collections')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/collector/collections') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/collector/collections') ? 'bg-emerald-50' : ''}`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{t('nav.myCollections', 'My Collections')}</span>
                {isActive('/collector/collections') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>
            </>
          )}

          {/* Super Admin Navigation */}
          {user.role === 'super_admin' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/superadmin')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/superadmin') ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/superadmin') ? 'bg-purple-50' : ''}`}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{t('nav.superadminOverview', 'Overview')}</span>
                {isActive('/superadmin') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-purple-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/superadmin/companies')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/superadmin/companies') ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/superadmin/companies') ? 'bg-purple-50' : ''}`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{t('nav.superadminCompanies', 'Companies')}</span>
                {isActive('/superadmin/companies') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-purple-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/superadmin/settings')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/superadmin/settings') ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/superadmin/settings') ? 'bg-purple-50' : ''}`}>
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{t('nav.superadminSettings', 'Settings')}</span>
                {isActive('/superadmin/settings') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-purple-600" />
                )}
              </button>
            </>
          )}

          {/* Customer Navigation */}
          {user.role === 'customer' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/customer')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all active:scale-95 cursor-pointer ${
                  isActive('/customer') ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive('/customer') ? 'bg-amber-50' : ''}`}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">My Portal</span>
                {isActive('/customer') && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-amber-600" />
                )}
              </button>
            </>
          )}

        </div>
      </nav>

      {/* Admin Native App "More" Bottom Sheet Modal */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs md:hidden flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="bg-white rounded-t-[32px] p-5 pb-8 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Native Pull Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {isBn ? 'সকল মেনু ও ফিচারস' : 'All Management Features'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isBn ? 'দ্রুত প্রবেশ করতে যে কোনো অপশন স্পর্শ করুন' : 'Tap any tool to navigate'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4">
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
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer ${
                      isActive(item.path)
                        ? 'bg-blue-50/80 border-blue-300 text-blue-800 shadow-xs'
                        : `${item.bg} hover:shadow-xs`
                    }`}
                  >
                    <div className={`p-2 rounded-xl bg-white shadow-2xs ${item.color} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {isBn ? 'ওপেন করুন ➔' : 'Open ➔'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreMenu(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
