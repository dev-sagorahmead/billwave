import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Users, AlertCircle, TrendingUp, Search, 
  Phone, Receipt, ArrowRight, CheckCircle2, RefreshCw, UserX, User
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';

export default function CollectorDashboard() {
  const { user } = useAuth();
  const { t, isBn, formatCurrency } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [collectCust, setCollectCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchCollectorData = async () => {
    try {
      setLoading(true);
      if (!user) return;
      const [colData, paymentsData] = await Promise.all([
        api.getCollector(user.id),
        api.getPayments('limit=10')
      ]);
      setStats(colData);
      setRecentPayments(paymentsData.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
          <span>{isBn ? 'কালেক্টর পোর্টাল লোড হচ্ছে...' : 'Loading collector portal...'}</span>
        </div>
      </div>
    );
  }

  const { collector, areas, stats: colStats } = stats;

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-24 md:pb-8 max-w-4xl mx-auto">
      
      {/* Welcome Card & Assigned Areas Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-5 text-white shadow-lg shadow-emerald-900/10 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
              {isBn ? 'মাঠপর্যায়ের বিল কালেক্টর' : 'Field Collection Agent'}
            </span>
            <h1 className="text-xl font-black mt-0.5">{collector.name}</h1>
            <p className="text-xs text-emerald-100">{collector.phone}</p>
          </div>

          <div className="flex-shrink-0">
            {collector.avatar ? (
              <img 
                src={collector.avatar} 
                alt={collector.name} 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/90 shadow-md ring-2 ring-emerald-400/40 bg-white" 
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-xs border-2 border-white/60 flex items-center justify-center text-white shadow-md">
                <User className="w-8 h-8 opacity-90" />
              </div>
            )}
          </div>
        </div>

        {/* Assigned Areas Badges */}
        <div className="pt-2 border-t border-emerald-600/50 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-emerald-200 text-[11px]">{isBn ? 'আপনার নির্ধারিত এলাকা:' : 'Assigned Areas:'}</span>
          {areas.map(a => (
            <span key={a.id} className="bg-emerald-600/80 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-500/40">
              {a.name} ({a.code})
            </span>
          ))}
        </div>
      </div>

      {/* Collector Metrics (Requirement 12) */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Today's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isBn ? 'আজকের আদায়' : "Today's Collection"}</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatCurrency(colStats.todayCollection)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colStats.todayTxCount} {isBn ? 'টি রশিদ ইস্যু হয়েছে' : 'receipts issued today'}
          </div>
        </div>

        {/* This Month's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isBn ? 'চলতি মাসের আদায়' : "This Month's Collection"}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {formatCurrency(colStats.monthCollection)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colStats.monthTxCount} {isBn ? 'টি আদায়' : 'transactions'}
          </div>
        </div>

        {/* Total Assigned Customers */}
        <div 
          onClick={() => navigate('/collector/customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isBn ? 'মোট গ্রাহক' : 'Assigned Customers'}</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {colStats.assignedCustomers}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-medium">{isBn ? 'সক্রিয়:' : 'Active:'} {colStats.activeCustomers ?? colStats.assignedCustomers}</span>
            {colStats.closedCustomers > 0 && (
              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md">{isBn ? 'বন্ধ:' : 'Closed:'} {colStats.closedCustomers}</span>
            )}
          </div>
        </div>

        {/* Total Outstanding in Assigned Areas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isBn ? 'এলাকার মোট বকেয়া' : 'Assigned Area Due'}</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {formatCurrency(colStats.totalDue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isBn ? 'আপনার এলাকার মোট বকেয়া' : 'Pending collection in your zone'}
          </div>
        </div>

      </div>

      {/* Closed Customers (বন্ধ গ্রাহক) Dedicated Card */}
      <div 
        onClick={() => navigate('/collector/customers?status=Closed')}
        className="bg-white p-4 rounded-3xl border border-rose-200/90 shadow-2xs cursor-pointer hover:border-rose-400 hover:shadow-sm transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 border border-rose-100 shadow-2xs">
            <UserX className="w-5 h-5 text-rose-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-rose-600 transition-colors">
              {isBn ? 'বন্ধ গ্রাহক তালিকা' : 'Closed Subscribers'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {isBn ? 'সংযোগ বিচ্ছিন্ন থাকা গ্রাহকদের তালিকা' : 'View disconnected lines'}
            </p>
          </div>
        </div>

        {/* Count placed directly above the 'তালিকা দেখুন' button */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-200/80 shadow-2xs">
            {colStats.closedCustomers ?? 0} {isBn ? 'জন বন্ধ' : 'Closed'}
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 group-hover:bg-rose-100 px-3 py-1 rounded-xl border border-rose-200 transition-colors">
            <span>{isBn ? 'তালিকা দেখুন' : 'View List'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Quick Search Jump Button for Field Collection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-slate-900">{isBn ? 'গ্রাহক অনুসন্ধান' : 'Instant Customer Lookup'}</h2>
          <p className="text-xs text-slate-500">{isBn ? 'আইডি বা মোবাইল নম্বর দিয়ে গ্রাহক খুঁজুন' : 'Search customer ID or mobile number in your area'}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/collector/customers')}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
        >
          {isBn ? 'গ্রাহক তালিকা খুলুন' : 'Open Customer List'}
        </button>
      </div>

      {/* Today's Payments & Receipts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'সাম্প্রতিক বিল আদায়' : 'Recent Collections'} ({recentPayments.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('/collector/collections')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            {isBn ? 'সকল আদায়' : 'All Collections'}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isBn ? 'আজ কোনো বিল আদায় করা হয়নি। বিল নিতে গ্রাহক খুঁজুন!' : 'No payments collected today. Find a customer to collect bills!'}
            </div>
          ) : (
            recentPayments.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{p.customer_name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">
                      {p.customer_code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {p.payment_time} • {p.payment_method} • {isBn ? 'রশিদ নং:' : 'Receipt:'} <span className="font-mono text-blue-600 font-semibold">{p.receipt_number}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-600">
                    +{formatCurrency(p.paid_amount)}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await api.getReceipt(p.receipt_number);
                      setActiveReceipt(r);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs rounded font-medium"
                  >
                    {isBn ? 'রশিদ' : 'Receipt'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchCollectorData();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

    </div>
  );
}
