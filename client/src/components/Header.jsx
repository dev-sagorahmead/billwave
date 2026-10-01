import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Tv, LogOut, User, Shield, Building2, Wallet
} from 'lucide-react';
import MarqueeNoticeBar from './MarqueeNoticeBar';
import { getImageUrl } from '../utils/api';

export default function Header() {
  const { user, company, logout, returnToSuperAdmin, isSuperImpersonating } = useAuth();
  const { t, isBn, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Shield className="w-3 h-3" /> {t('role.superAdmin', 'Super Admin')}</span>;
      case 'company_admin':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Building2 className="w-3 h-3" /> {t('role.companyAdmin', 'Company Admin')}</span>;
      case 'collector':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Wallet className="w-3 h-3" /> {t('role.collector', 'Bill Collector')}</span>;
      case 'customer':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><User className="w-3 h-3" /> {t('role.customer', 'Customer')}</span>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Super Admin Auto-Login Impersonation Active Banner */}
      {isSuperImpersonating && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white px-4 py-2.5 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md border-b border-purple-800 no-print z-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <Shield className="w-4 h-4 text-purple-300" />
            <span>সুপার এডমিন অটো-লগইন মোড: আপনি বর্তমানে <strong>{company?.name}</strong>-এর কোম্পানি এডমিন হিসেবে ব্রাউজ করছেন</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await returnToSuperAdmin();
              navigate('/superadmin');
            }}
            className="px-3.5 py-1.5 bg-white text-purple-950 hover:bg-purple-100 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap"
          >
            সুপার এডমিন প্যানেলে ফিরুন ➔
          </button>
        </div>
      )}

      {/* Marquee Announcement Ticker for targeted company or collector */}
      <MarqueeNoticeBar />

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand & Company Details / Large Logo */}
          <div className="flex items-center min-w-0 pr-2 h-full">
            {company?.logo ? (
              <div className="flex items-center h-full py-0.5">
                <img 
                  src={getImageUrl(company.logo)} 
                  alt={company.name || 'Company Logo'} 
                  className="h-12 sm:h-14 md:h-[58px] max-h-[58px] w-auto max-w-[220px] sm:max-w-[340px] md:max-w-[420px] object-contain object-left drop-shadow-2xs transition-all"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
                {/* Fallback if logo fails to load */}
                <div style={{ display: 'none' }} className="items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-base leading-tight">
                      {company ? company.name : 'DishBilling Cloud'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
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
                      <span>{t('header.support', 'Support:')} {company.phone}</span>
                    ) : (
                      <span>Multi-Tenant Cable TV Platform</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right actions: Language Switcher, User Profile & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Quick 1-Tap Language Toggle (App style) */}
            <button
              type="button"
              onClick={() => changeLanguage(isBn ? 'en' : 'bn')}
              className="px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <span className={isBn ? 'text-blue-600 font-extrabold' : 'text-slate-400 font-medium'}>বাং</span>
              <span className="text-slate-300">|</span>
              <span className={!isBn ? 'text-blue-600 font-extrabold' : 'text-slate-400 font-medium'}>EN</span>
            </button>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-800 leading-tight flex items-center justify-end gap-1.5">
                  <span>{user?.name}</span>
                  {user && getRoleBadge(user.role)}
                </div>
                <div className="text-[10px] text-slate-500">{user?.email}</div>
              </div>

              {/* Mobile Role Badge Pill */}
              <div className="sm:hidden">
                {user?.role === 'company_admin' && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                    এডমিন
                  </span>
                )}
                {user?.role === 'collector' && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                    কালেক্টর
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer active:scale-95"
                title={t('nav.logout', 'Logout')}
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
    </>
  );
}
