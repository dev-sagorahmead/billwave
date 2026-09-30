import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Receipt, Calendar, Wallet, RefreshCw, Eye, Search, 
  ChevronDown, ChevronUp, Phone, CheckCircle2, Filter, 
  ArrowRight, User, Clock, CreditCard, Sparkles, X
} from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';
import { formatBillingMonth, toBengaliNumerals } from '../../utils/monthHelper';

export default function CollectorCollections() {
  const { user } = useAuth();
  const { isBn, formatCurrency } = useLanguage();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Filters: Preset, Specific Month, Specific Date, Search
  const [dateFilter, setDateFilter] = useState('this_month'); // 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'all' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(''); // 'YYYY-MM'
  const [specificDate, setSpecificDate] = useState(''); // 'YYYY-MM-DD'
  const [searchTerm, setSearchTerm] = useState('');

  // Expand / collapse dates tracking (all open by default)
  const [collapsedDates, setCollapsedDates] = useState({});

  // Generate last 12 months for month filter dropdown
  const monthOptions = React.useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = formatBillingMonth(val, isBn ? 'bengali' : 'english');
      list.push({ value: val, label });
    }
    return list;
  }, [isBn]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const queryParts = [];

      if (specificDate) {
        queryParts.push(`specific_date=${specificDate}`);
      } else if (selectedMonth) {
        queryParts.push(`month=${selectedMonth}`);
      } else if (dateFilter) {
        queryParts.push(`date_filter=${dateFilter}`);
      }

      if (searchTerm.trim()) {
        queryParts.push(`search=${encodeURIComponent(searchTerm.trim())}`);
      }

      queryParts.push('limit=1000');

      const res = await api.getPayments(queryParts.join('&'));
      setPayments(res.payments || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [dateFilter, selectedMonth, specificDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCollections();
  };

  const handleResetFilters = () => {
    setDateFilter('this_month');
    setSelectedMonth('');
    setSpecificDate('');
    setSearchTerm('');
  };

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const r = await api.getReceipt(receiptNum);
      setActiveReceipt(r);
    } catch (err) {
      alert((isBn ? 'রশিদ লোড করা সম্ভব হয়নি: ' : 'Could not open receipt: ') + err.message);
    }
  };

  const toggleDateCollapse = (dateStr) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Group payments by date (YYYY-MM-DD)
  const groupedByDate = React.useMemo(() => {
    const groups = {};
    for (const p of payments) {
      const d = p.payment_date || 'Unknown';
      if (!groups[d]) {
        groups[d] = {
          date: d,
          total: 0,
          items: []
        };
      }
      groups[d].items.push(p);
      groups[d].total += Number(p.paid_amount || 0);
    }
    // Convert to sorted array (newest date first)
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [payments]);

  // Overall Total
  const totalCollected = payments.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);

  // Format date display label
  const formatDateLabel = (dateStr) => {
    if (!dateStr || dateStr === 'Unknown') return isBn ? 'তারিখবিহীন' : 'Unknown Date';
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];

    const dObj = new Date(dateStr);
    const formatted = dObj.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (dateStr === todayStr) {
      return {
        title: isBn ? `আজ, ${formatted}` : `Today, ${formatted}`,
        isToday: true,
        isYesterday: false
      };
    }
    if (dateStr === yestStr) {
      return {
        title: isBn ? `গতকাল, ${formatted}` : `Yesterday, ${formatted}`,
        isToday: false,
        isYesterday: true
      };
    }
    return {
      title: formatted,
      isToday: false,
      isYesterday: false
    };
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 pb-24 md:pb-8 max-w-4xl mx-auto">
      
      {/* 1. App Header & Summary Card */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-950/20 border border-emerald-700/40 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
                {isBn ? 'কালেকশন হিস্ট্রি ও তারিখভিত্তিক বিবরণী' : 'Date-by-Date Collection Ledger'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-0.5">
                {isBn ? 'আমার আদায়কৃত বিলের ইতিহাস' : 'My Collection Records'}
              </h1>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {isBn 
                  ? 'কোন মাসে কোন তারিখে কার কার বিল কত টাকা আদায় হয়েছে তার বিস্তারিত তালিকা' 
                  : 'Detailed breakdown of who paid, when, and how much by date & month'}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCollections}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
              title={isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>

          {/* Quick Aggregate Stats inside Hero Card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] sm:text-[11px] text-emerald-200 block">
                {isBn ? 'মোট আদায়কৃত টাকা' : 'Total Collected'}
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white block mt-0.5">
                {formatCurrency(totalCollected)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] sm:text-[11px] text-emerald-200 block">
                {isBn ? 'মোট রসিদ / গ্রাহক' : 'Total Receipts'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-white block mt-0.5">
                {payments.length} {isBn ? 'টি' : ''}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[10px] sm:text-[11px] text-emerald-200 block">
                {isBn ? 'আদায়ের কার্যদিবস' : 'Active Collection Days'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-cyan-200 block mt-0.5">
                {groupedByDate.length} {isBn ? 'দিন' : 'days'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Controls (Month, Date, Presets, Search) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3.5">
        
        {/* Row 1: Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isBn ? 'গ্রাহকের নাম, মোবাইল, গ্রাহক আইডি বা রসিদ নম্বর দিয়ে খুঁজুন...' : 'Search by Customer Name, Phone, ID, or Receipt #...'}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {isBn ? 'খুঁজুন' : 'Search'}
          </button>
        </form>

        {/* Row 2: Month & Specific Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          
          {/* Select Specific Month (কোন মাসে) */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap pl-1">
              {isBn ? 'মাস নির্বাচন:' : 'Month:'}
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSpecificDate('');
                setDateFilter('');
              }}
              className="w-full bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">{isBn ? '-- নির্দিষ্ট মাস বেছে নিন --' : '-- Choose Specific Month --'}</option>
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Select Specific Date (কোন তারিখে) */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap pl-1">
              {isBn ? 'নির্দিষ্ট তারিখ:' : 'Date:'}
            </span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                setSelectedMonth('');
                setDateFilter('');
              }}
              className="w-full bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            {specificDate && (
              <button
                type="button"
                onClick={() => setSpecificDate('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                title="Clear date"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Row 3: Quick Filter Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 no-scrollbar">
          <span className="text-slate-400 text-[11px] font-bold shrink-0 mr-1">
            {isBn ? 'কুইক ফিল্টার:' : 'Presets:'}
          </span>
          {[
            { id: 'today', label: isBn ? 'আজকের আদায়' : "Today" },
            { id: 'yesterday', label: isBn ? 'গতকাল' : 'Yesterday' },
            { id: 'this_week', label: isBn ? 'চলতি সপ্তাহ' : 'This Week' },
            { id: 'this_month', label: isBn ? 'চলতি মাস' : 'This Month' },
            { id: 'last_month', label: isBn ? 'গত মাস' : 'Last Month' },
            { id: 'all', label: isBn ? 'সকল হিস্টরি' : 'All Time' }
          ].map(f => {
            const isSelected = !specificDate && !selectedMonth && dateFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSpecificDate('');
                  setSelectedMonth('');
                  setDateFilter(f.id);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/25'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            );
          })}

          {(selectedMonth || specificDate || searchTerm || dateFilter !== 'this_month') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors ml-auto cursor-pointer"
            >
              {isBn ? 'রিসেট' : 'Reset'}
            </button>
          )}
        </div>

      </div>

      {/* 3. Date-by-Date Grouped Collections List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="font-bold">{isBn ? 'তারিখভিত্তিক আদায় হিস্ট্রি লোড হচ্ছে...' : 'Loading collections...'}</span>
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-700 text-sm">
              {isBn ? 'নির্বাচিত ফিল্টারে কোনো বিল আদায়ের রেকর্ড পাওয়া যায়নি' : 'No collection records found for this period'}
            </div>
            <p className="text-slate-400 max-w-sm mx-auto">
              {isBn 
                ? 'অন্য কোনো মাস বা তারিখ নির্বাচন করে আবার চেষ্টা করুন অথবা রিসেট বাটনে চাপুন।' 
                : 'Try selecting a different date or month, or click Reset.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {isBn ? 'চলতি মাসের আদায় দেখুন' : "View This Month's Collections"}
            </button>
          </div>
        ) : (
          groupedByDate.map((group) => {
            const { title, isToday, isYesterday } = formatDateLabel(group.date);
            const isCollapsed = !!collapsedDates[group.date];

            return (
              <div 
                key={group.date}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* Date Group Header Card */}
                <div 
                  onClick={() => toggleDateCollapse(group.date)}
                  className={`p-4 sm:p-4.5 flex items-center justify-between cursor-pointer select-none transition-colors border-b ${
                    isToday
                      ? 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60'
                      : isYesterday
                      ? 'bg-blue-50/60 border-blue-200/80 hover:bg-blue-100/50'
                      : 'bg-slate-50/90 border-slate-200/80 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                      isToday
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : isYesterday
                        ? 'bg-blue-600 text-white shadow-blue-600/30'
                        : 'bg-slate-800 text-white'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                          {title}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                            {isBn ? 'আজ' : 'Today'}
                          </span>
                        )}
                        {isYesterday && (
                          <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                            {isBn ? 'গতকাল' : 'Yesterday'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        <span>{group.items.length} {isBn ? 'জন গ্রাহকের বিল আদায় হয়েছে' : 'customers collected'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        {isBn ? 'তারিখের মোট' : 'Day Total'}
                      </span>
                      <span className="font-black font-mono text-sm sm:text-base text-emerald-600 block">
                        +{formatCurrency(group.total)}
                      </span>
                    </div>

                    <div className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                      {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Date Detailed Customer Records */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {group.items.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 sm:p-4.5 hover:bg-slate-50/70 transition-colors space-y-2.5"
                      >
                        {/* Upper row: Customer Info & Collected Amount */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-900">
                                {p.customer_name}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                {p.customer_code}
                              </span>
                              {p.area_name && (
                                <span className="text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                  {p.area_name}
                                </span>
                              )}
                            </div>

                            {/* Contact & Address */}
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              {p.customer_phone && (
                                <a 
                                  href={`tel:${p.customer_phone}`}
                                  className="text-emerald-700 hover:underline flex items-center gap-0.5 font-bold"
                                  title={isBn ? 'গ্রাহককে কল দিন' : 'Call customer'}
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{p.customer_phone}</span>
                                </a>
                              )}
                              {p.customer_address && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="truncate max-w-[200px] text-slate-400">{p.customer_address}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base sm:text-lg font-black font-mono text-emerald-600 block">
                              +{formatCurrency(p.paid_amount || 0)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {isBn ? 'অবশিষ্ট বকেয়া: ' : 'Remaining: '}
                              <strong className="text-slate-600 font-mono">{formatCurrency(p.remaining_due || 0)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Lower row: Billing Month, Time, Payment Method, & Receipt Button */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Billing month badge */}
                            {p.billing_month && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                {formatBillingMonth(p.billing_month, isBn ? 'bengali' : 'english')} {isBn ? 'এর বিল' : 'bill'}
                              </span>
                            )}

                            {/* Payment time */}
                            {p.payment_time && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                <Clock className="w-3 h-3" />
                                <span>{p.payment_time}</span>
                              </span>
                            )}

                            {/* Method */}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {p.payment_method || 'Cash'}
                            </span>

                            {/* Receipt Number */}
                            <span className="text-[10px] font-mono text-slate-400">
                              {p.receipt_number}
                            </span>
                          </div>

                          {/* 1-Tap Digital Receipt Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(p.receipt_number)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>{isBn ? 'রসিদ দেখুন' : 'View Receipt'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Digital Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

    </div>
  );
}
