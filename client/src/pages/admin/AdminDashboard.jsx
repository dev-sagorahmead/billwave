import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Users, AlertCircle, Wallet, TrendingUp, UserCheck, 
  MapPin, Receipt, PlusCircle, ArrowRight,
  FileText, Upload, RefreshCw, Phone, CreditCard,
  BarChart3, ChevronRight, CheckCircle2, Calendar, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend 
} from 'recharts';
import ReceiptModal from '../../components/ReceiptModal';
import PaymentModal from '../../components/PaymentModal';

export default function AdminDashboard() {
  const { user, company } = useAuth();
  const { isBn, formatCurrency } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectCust, setCollectCust] = useState(null);
  const [mobileTab, setMobileTab] = useState('collectors'); // 'collectors' | 'payments' | 'chart'
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanyDashboard();
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const receipt = await api.getReceipt(receiptNum);
      setActiveReceipt(receipt);
    } catch (err) {
      alert(isBn ? 'রশিদ লোড করা সম্ভব হয়নি: ' + err.message : 'Could not load receipt: ' + err.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-3 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xs mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="text-xs font-bold text-slate-800">
            {isBn ? 'ড্যাশবোর্ড তথ্য লোড হচ্ছে...' : 'Loading dashboard...'}
          </div>
          <div className="text-[11px] text-slate-400">
            {isBn ? 'অনুগ্রহ করে অপেক্ষা করুন' : 'Please wait a moment'}
          </div>
        </div>
      </div>
    );
  }

  const { metrics, collectorPerformance, recentPayments, monthlyTrend } = data;

  // Format today's date nicely for app header
  const todayDateStr = new Date().toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* 1. App Top Header Greeting Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#061224] to-[#0284c7] flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-900/20 shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                {isBn ? 'স্বাগতম' : 'Welcome'}, {user?.name || (isBn ? 'এডমিন' : 'Admin')}
              </span>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-200 hidden sm:inline">
                {company?.name || 'Company'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{todayDateStr}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
          title={isBn ? 'রিফ্রেশ' : 'Refresh'}
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
        </button>
      </div>

      {/* 2. Hero Financial Wallet Card (Brand Navy & Cyan Gradient) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061224] via-[#0b244d] to-[#0284c7] p-5 sm:p-7 text-white shadow-xl shadow-blue-950/20 border border-blue-900/40">
        
        {/* Subtle decorative glow */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-44 h-44 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          
          {/* Top Row: Today's Collection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-cyan-200 text-xs font-bold tracking-wide uppercase">
                <Wallet className="w-4 h-4 text-cyan-300" />
                <span>{isBn ? 'আজকের মোট আদায়' : "Today's Collection"}</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1 tracking-tight">
                {formatCurrency(metrics.todayCollection)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-blue-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{metrics.todayTxCount} {isBn ? 'টি আদায় আজ সম্পন্ন' : 'receipts today'}</span>
              </span>
            </div>
          </div>

          {/* Bottom Grid Inside Wallet Card: Month's Collection & Total Due */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/15">
            
            {/* This Month's Collection */}
            <div 
              onClick={() => navigate('/admin/collections?date_filter=this_month')}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/15 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="text-[11px] text-blue-200 font-medium flex items-center justify-between">
                <span>{isBn ? 'চলতি মাস' : 'This Month'}</span>
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
                {formatCurrency(metrics.thisMonthCollection)}
              </div>
              <div className="text-[10px] text-blue-200/80 mt-0.5 truncate">
                {isBn ? 'ধার্যকৃত বিল: ' : 'Billed: '}{formatCurrency(metrics.monthlyBilling?.total_billed || 0)}
              </div>
            </div>

            {/* Total Outstanding Due */}
            <div 
              onClick={() => navigate('/admin/dues')}
              className="bg-rose-500/20 hover:bg-rose-500/25 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-rose-300/30 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="text-[11px] text-rose-200 font-medium flex items-center justify-between">
                <span>{isBn ? 'সর্বমোট বকেয়া' : 'Total Due'}</span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-200 font-mono mt-0.5">
                {formatCurrency(metrics.totalDue)}
              </div>
              <div className="text-[10px] text-rose-200/90 mt-0.5 flex items-center gap-0.5 font-bold">
                <span>{isBn ? 'বকেয়া দেখুন' : 'View Dues'}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. App Quick Actions Grid (8 Mobile App Icon Tiles) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 mb-3 px-1">
          {isBn ? 'দ্রুত কাজের মেনু (Quick Actions)' : 'Quick Actions'}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
          
          {/* Action 1: Add Customer */}
          <button
            type="button"
            onClick={() => navigate('/admin/customers?action=new')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'নতুন গ্রাহক' : 'Add Client'}
            </span>
          </button>

          {/* Action 2: Collections */}
          <button
            type="button"
            onClick={() => navigate('/admin/collections')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'কালেকশন' : 'Collection'}
            </span>
          </button>

          {/* Action 3: Due List */}
          <button
            type="button"
            onClick={() => navigate('/admin/dues')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'বকেয়া তালিকা' : 'Due List'}
            </span>
          </button>

          {/* Action 4: Auto Billing */}
          <button
            type="button"
            onClick={() => navigate('/admin/billing')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'অটো বিলিং' : 'Billing'}
            </span>
          </button>

          {/* Action 5: Collectors */}
          <button
            type="button"
            onClick={() => navigate('/admin/collectors')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'কালেক্টর' : 'Staff'}
            </span>
          </button>

          {/* Action 6: Areas */}
          <button
            type="button"
            onClick={() => navigate('/admin/areas')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'এলাকা' : 'Areas'}
            </span>
          </button>

          {/* Action 7: Reports */}
          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200/60 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25 group-hover:scale-105 transition-transform mb-1.5">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'রিপোর্ট' : 'Reports'}
            </span>
          </button>

          {/* Action 8: Import */}
          <button
            type="button"
            onClick={() => navigate('/admin/import')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-100/70 hover:bg-slate-200/70 border border-slate-200/80 transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-md shadow-slate-700/25 group-hover:scale-105 transition-transform mb-1.5">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              {isBn ? 'ইম্পোর্ট' : 'Import'}
            </span>
          </button>

        </div>
      </div>

      {/* 4. Customer Breakdown Pill Bar (App Widget Style) */}
      <div 
        onClick={() => navigate('/admin/customers')}
        className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-blue-400 transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900">
              {isBn ? 'গ্রাহক লাইন পরিস্থিতি' : 'Subscriber Line Status'}
            </span>
          </div>
          <div className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
            <span>{isBn ? 'মোট' : 'Total'}: {metrics.totalCustomers}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-emerald-50 border border-emerald-200/70 py-2 rounded-2xl">
            <div className="text-base sm:text-lg font-black text-emerald-700">{metrics.activeCustomers}</div>
            <div className="text-[10px] font-bold text-emerald-800">{isBn ? '🟢 সক্রিয়' : 'Active'}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200/70 py-2 rounded-2xl">
            <div className="text-base sm:text-lg font-black text-blue-700">{metrics.freeCustomers}</div>
            <div className="text-[10px] font-bold text-blue-800">{isBn ? '🔵 ফ্রি' : 'Free'}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200/70 py-2 rounded-2xl">
            <div className="text-base sm:text-lg font-black text-rose-700">{metrics.closedCustomers}</div>
            <div className="text-[10px] font-bold text-rose-800">{isBn ? '🔴 বন্ধ' : 'Closed'}</div>
          </div>
        </div>
      </div>

      {/* 5. Mobile Segmented Tab Switcher (Visible on mobile screens) */}
      <div className="sm:hidden flex items-center bg-slate-200/70 p-1 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab('collectors')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center ${
            mobileTab === 'collectors'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isBn ? `কালেক্টর (${collectorPerformance.length})` : `Staff (${collectorPerformance.length})`}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('payments')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center ${
            mobileTab === 'payments'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isBn ? `রসিদ (${recentPayments.length})` : `Receipts (${recentPayments.length})`}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center ${
            mobileTab === 'chart'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isBn ? 'ট্রেন্ড চার্ট' : 'Chart'}
        </button>
      </div>

      {/* 6. Section A: Collector Performance */}
      <div className={`${mobileTab !== 'collectors' ? 'hidden sm:block' : 'block'}`}>
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>{isBn ? 'ফিল্ড কালেক্টরদের লাইভ আদায়' : 'Field Staff Live Collections'}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                {isBn ? 'আজ ও চলতি মাসের আদায়' : "Today & Month's performance"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/collectors')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-0.5"
            >
              <span>{isBn ? 'সব দেখুন' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {collectorPerformance.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {isBn ? 'কোনো কালেক্টর তথ্য পাওয়া যায়নি।' : 'No collectors found.'}
              </div>
            ) : (
              collectorPerformance.map((col) => (
                <div key={col.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-black flex items-center justify-center text-sm border border-emerald-200 shrink-0">
                      {col.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{col.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {col.phone && (
                          <a 
                            href={`tel:${col.phone}`} 
                            className="text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                            title={isBn ? 'কল করুন' : 'Call'}
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{col.phone}</span>
                          </a>
                        )}
                        <span>•</span>
                        <span>{col.assignedCustomers} {isBn ? 'গ্রাহক' : 'clients'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black font-mono text-xs sm:text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                      {isBn ? 'আজ: ' : 'Today: '}{formatCurrency(col.todayCollection)}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono mt-1">
                      {isBn ? 'মাস: ' : 'Month: '}{formatCurrency(col.monthCollection)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 7. Section B: Recent Payments Feed (Activity Stream) */}
      <div className={`${mobileTab !== 'payments' ? 'hidden sm:block' : 'block'}`}>
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>{isBn ? 'সাম্প্রতিক আদায় ও ডিজিটাল রসিদ' : 'Recent Collections & Receipts'}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                {isBn ? 'সর্বশেষ আদায়কৃত পেমেন্টের লাইভ তালিকা' : 'Live payment stream'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/collections')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-0.5"
            >
              <span>{isBn ? 'সব দেখুন' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {recentPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {isBn ? 'কোনো কালেকশন পাওয়া যায়নি।' : 'No payments collected yet.'}
              </div>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {p.customer_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 font-bold shrink-0">
                        {p.cust_code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span>{p.payment_date}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{p.collector_name || (isBn ? 'অফিস' : 'Office')}</span>
                      <span>•</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1 rounded font-bold">{p.payment_method}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black font-mono text-xs sm:text-sm text-emerald-600">
                      +{formatCurrency(p.paid_amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenReceipt(p.receipt_number)}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      {isBn ? 'রশিদ' : 'Receipt'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 8. Section C: Monthly Collection Trend Chart */}
      <div className={`${mobileTab !== 'chart' ? 'hidden sm:block' : 'block'}`}>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>{isBn ? 'আদায় ও বিলিং ট্রেন্ড (বিগত ৬ মাস)' : 'Collection & Billing Trend (Last 6 Months)'}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                {isBn ? 'ধার্যকৃত বিল বনাম আদায়কৃত টাকার তুলনা' : 'Monthly billed vs collected'}
              </p>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip 
                  formatter={(val) => [formatCurrency(val)]}
                  contentStyle={{ borderRadius: '16px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="collected" name={isBn ? 'আদায়' : 'Collected'} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="billed" name={isBn ? 'ধার্য বিল' : 'Billed'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchDashboard();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

    </div>
  );
}
