import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Users, Search, Phone, Wallet, Eye, 
  MapPin, CheckCircle, AlertCircle, RefreshCw, X, History,
  UserX, Filter, CheckCircle2
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';
import CustomerPaymentHistoryModal from '../../components/CustomerPaymentHistoryModal';

export default function CollectorCustomers() {
  const { user } = useAuth();
  const { isBn, formatStatus, formatCurrency } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all'); // 'all' | 'Active' | 'Closed'
  const [dueFilter, setDueFilter] = useState(searchParams.get('status') === 'Closed' ? '' : 'has_due'); // default prioritize due unless Closed requested

  // Modals
  const [collectCust, setCollectCust] = useState(null);
  const [historyCust, setHistoryCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [viewProfileCust, setViewProfileCust] = useState(null);

  // Sync if URL search params change
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      if (urlStatus === 'Closed') {
        setDueFilter('');
      }
    }
  }, [searchParams]);

  const loadAreas = async () => {
    try {
      const a = await api.getAreas();
      setAreas(a);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        area_id: selectedAreaId,
        limit: 150
      };

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (dueFilter) {
        params.due_type = dueFilter;
      }

      const query = new URLSearchParams(params).toString();
      const res = await api.getCustomers(query);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers for collector:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [selectedAreaId, statusFilter, dueFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    if (newStatus === 'Closed') {
      setDueFilter(''); // show all closed customers by default
      setSearchParams({ status: 'Closed' });
    } else if (newStatus === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: newStatus });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-24 md:pb-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>{isBn ? 'নির্ধারিত এলাকার গ্রাহক তালিকা' : 'Assigned Area Customers'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {statusFilter === 'Closed' 
              ? (isBn ? 'আপনার নির্দিষ্ট এলাকার লাইন বন্ধ থাকা গ্রাহকদের তালিকা' : 'Suspended/Closed customer accounts in your area') 
              : (isBn ? 'শুধুমাত্র আপনার নির্ধারিত এলাকার গ্রাহকদের তালিকা' : 'Showing customers strictly within your assigned territory')}
          </p>
        </div>

        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full border ${
          statusFilter === 'Closed'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {customers.length} {isBn ? 'জন গ্রাহক' : 'Subscribers'}
        </span>
      </div>

      {/* Fast Touch Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isBn ? 'গ্রাহক আইডি, নাম অথবা মোবাইল নম্বর দিয়ে খুঁজুন...' : 'Search by Customer ID, name or phone...'}
          className="w-full pl-10 pr-24 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
        >
          {isBn ? 'খুঁজুন' : 'Search'}
        </button>
      </form>

      {/* Filter Chips & Area Dropdown */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        
        {/* Area filter */}
        <select
          value={selectedAreaId}
          onChange={(e) => setSelectedAreaId(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium shrink-0 shadow-2xs"
        >
          <option value="all">{isBn ? 'সকল এরিয়া (All Areas)' : 'All Areas'}</option>
          {areas.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Due filter chips */}
        <button
          type="button"
          onClick={() => {
            if (statusFilter === 'Closed') {
              setStatusFilter('all');
              setSearchParams({});
            }
            setDueFilter(dueFilter === 'has_due' ? '' : 'has_due');
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all cursor-pointer ${
            dueFilter === 'has_due' && statusFilter !== 'Closed'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {isBn ? 'বকেয়া বিল গ্রাহক' : 'Due Customers'}
        </button>

        {/* পরিশোধিত ট্যাব */}
        <button
          type="button"
          onClick={() => {
            if (statusFilter === 'Closed') {
              setStatusFilter('all');
              setSearchParams({});
            }
            setDueFilter(dueFilter === 'zero_due' ? '' : 'zero_due');
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all cursor-pointer ${
            dueFilter === 'zero_due' && statusFilter !== 'Closed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {isBn ? 'পরিশোধিত (০ বকেয়া)' : 'Paid (0 Due)'}
        </button>

        {/* বন্ধ গ্রাহক বাটন (পরিশোধিত ট্যাবের ঠিক পাশে) */}
        <button
          type="button"
          onClick={() => {
            if (statusFilter === 'Closed') {
              setStatusFilter('all');
              setDueFilter('has_due');
              setSearchParams({});
            } else {
              setStatusFilter('Closed');
              setDueFilter('');
              setSearchParams({ status: 'Closed' });
            }
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'Closed'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
          }`}
          title={isBn ? 'সংযোগ বন্ধ থাকা গ্রাহকদের দেখুন' : 'View closed / suspended accounts'}
        >
          <span className={`w-2 h-2 rounded-full ${statusFilter === 'Closed' ? 'bg-white' : 'bg-rose-500 animate-pulse'}`} />
          <UserX className="w-3.5 h-3.5" />
          <span>{isBn ? 'বন্ধ গ্রাহক' : 'Closed Customers'}</span>
        </button>

        {(dueFilter || statusFilter === 'Closed' || selectedAreaId !== 'all' || search) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedAreaId('all');
              setStatusFilter('all');
              setDueFilter('');
              setSearchParams({});
            }}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 whitespace-nowrap cursor-pointer"
          >
            {isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}
          </button>
        )}

      </div>

      {/* Notice Banner when viewing Closed Customers */}
      {statusFilter === 'Closed' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
            <span>
              <strong>{isBn ? 'বন্ধ গ্রাহক মোড:' : 'Closed Account Mode:'}</strong>{' '}
              {isBn 
                ? 'এই গ্রাহকদের সংযোগ বন্ধ আছে। কোম্পানির এডমিন একটিভ না করা পর্যন্ত কালেক্টর বিল নিতে পারবেন না।' 
                : 'These accounts are suspended. Bill collection is blocked until Company Admin activates them.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchParams({});
            }}
            className="underline font-bold hover:text-rose-950 text-[11px] whitespace-nowrap ml-3 cursor-pointer"
          >
            {isBn ? 'সব দেখুন' : 'View All'}
          </button>
        </div>
      )}

      {/* Customer Mobile Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>{isBn ? 'গ্রাহকের তথ্য লোড হচ্ছে...' : 'Loading customer records...'}</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            {statusFilter === 'Closed' 
              ? (isBn ? 'আপনার এরিয়ায় বর্তমানে কোনো বন্ধ গ্রাহক নেই।' : 'No closed accounts found in your assigned area.') 
              : (isBn ? 'কোনো গ্রাহক পাওয়া যায়নি। ফিল্টার বা সার্চ চেক করুন।' : 'No customers found matching search/filter.')}
          </div>
        ) : (
          customers.map((c) => {
            const dueVal = Number(c.current_due) || 0;
            const isAdvance = dueVal < 0;
            const hasDue = dueVal > 0;
            const isClosed = c.status === 'Closed';

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${
                  isClosed
                    ? 'border-rose-200 hover:border-rose-400 bg-rose-50/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                {/* Customer Top Details & Due Summary */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                        {c.name}
                      </span>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {c.customer_id}
                      </span>

                      {/* Prominent Closed Line Badge */}
                      {isClosed && (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          {isBn ? 'লাইন বন্ধ (Closed)' : 'Closed'}
                        </span>
                      )}

                      {c.status === 'Free' && (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                          {isBn ? 'ফ্রি গ্রাহক' : 'Free Customer'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 font-mono text-emerald-700 font-semibold hover:underline"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{c.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{isBn ? 'ফোন নম্বর নেই' : 'No phone'}</span>
                      )}

                      {c.area_name && (
                        <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                          {c.area_name}
                        </span>
                      )}
                    </div>

                    {(c.address || c.road_house_info) && (
                      <div className="text-[11px] text-slate-500 leading-tight line-clamp-1">
                        {c.road_house_info ? `${c.road_house_info}, ` : ''}{c.address}
                      </div>
                    )}
                  </div>

                  {/* Balance / Due Badge */}
                  <div className={`text-right shrink-0 px-3 py-2 rounded-xl border ${
                    isClosed
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      {isAdvance ? (isBn ? 'অগ্রিম জমা' : 'Advance') : (isBn ? 'বকেয়া বিল' : 'Due Balance')}
                    </span>
                    <span className={`text-base sm:text-lg font-black font-mono leading-tight block ${
                      hasDue ? 'text-rose-600' : isAdvance ? 'text-emerald-600' : 'text-slate-700'
                    }`}>
                      {isAdvance ? `+${formatCurrency(Math.abs(dueVal))}` : formatCurrency(dueVal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                      {isBn ? 'মাসিক বিল:' : 'Monthly:'} {formatCurrency(c.monthly_bill || 0)}
                    </span>
                  </div>
                </div>

                {/* Clean, Modern Action Buttons Row */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                  {/* 1. Phone Call */}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors border border-emerald-200 shadow-2xs flex items-center justify-center shrink-0"
                      title={isBn ? `কল করুন: ${c.phone}` : `Call: ${c.phone}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  {/* 2. Customer Payment History */}
                  <button
                    type="button"
                    onClick={() => setHistoryCust(c)}
                    className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-blue-200 shadow-2xs shrink-0 cursor-pointer"
                    title={isBn ? 'পূর্বের বিল আদায়ের ইতিহাস দেখুন' : 'View past payment history'}
                  >
                    <History className="w-4 h-4 text-blue-600" />
                    <span>{isBn ? 'হিস্টরি' : 'History'}</span>
                  </button>

                  {/* 3. Customer Profile View */}
                  <button
                    type="button"
                    onClick={() => setViewProfileCust(c)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-colors border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 cursor-pointer"
                    title={isBn ? 'গ্রাহকের সম্পূর্ণ তথ্য দেখুন' : 'View complete customer details'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* 4. Primary Collect Bill Button / Blocked for Closed Customers */}
                  {isClosed ? (
                    <button
                      type="button"
                      onClick={() => {
                        const alertMsg = isBn 
                          ? `⚠️ গ্রাহকের সংযোগ বন্ধ আছে!\n\nগ্রাহক: ${c.name} (${c.customer_id})\nবকেয়া: ${dueVal} টাকা\n───────────────────────────────\nকালেক্টর বন্ধ গ্রাহকের বিল নিতে পারবেন না। কোম্পানির এডমিন এই গ্রাহককে একটিভ (Active) করার পর বিল আদায় করা যাবে।`
                          : `⚠️ Customer connection is closed!\n\nCustomer: ${c.name} (${c.customer_id})\nDue: ${dueVal} BDT\n───────────────────────────────\nCollectors cannot collect bills from closed customers. Billing will resume once Company Admin activates this account.`;
                        alert(alertMsg);
                      }}
                      className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-2xs cursor-pointer"
                      title={isBn ? 'গ্রাহকের সংযোগ বন্ধ থাকায় বিল নেওয়া যাবে না। কোম্পানি এডমিন একটিভ করতে পারবে।' : 'Connection is closed. Bill collection disabled.'}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>{isBn ? 'সংযোগ বন্ধ (বিল নেওয়া যাবে না)' : 'Closed (Collection Blocked)'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCollectCust(c)}
                      className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>{isBn ? 'বিল নিন' : 'Collect Bill'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Customer Profile Quick View for Collector */}
      {viewProfileCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">{viewProfileCust.name}</h3>
                  {viewProfileCust.status === 'Closed' && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                      {isBn ? 'লাইন বন্ধ' : 'Closed'}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-blue-600 font-semibold">{viewProfileCust.customer_id}</span>
              </div>
              <button onClick={() => setViewProfileCust(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'মোবাইল:' : 'Phone:'}</span> <span className="font-semibold text-slate-900">{viewProfileCust.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'ঠিকানা:' : 'Address:'}</span> <span className="font-medium text-slate-800">{viewProfileCust.address || '-'}</span></div>
              {viewProfileCust.road_house_info && <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'রোড / ফ্ল্যাট:' : 'Road / Flat:'}</span> <span className="font-medium text-slate-800">{viewProfileCust.road_house_info}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'এরিয়া:' : 'Area:'}</span> <span className="font-medium text-slate-800">{viewProfileCust.area_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'প্যাকেজ:' : 'Package:'}</span> <span className="font-medium text-slate-800">{viewProfileCust.package_name || 'Standard'} ({formatCurrency(viewProfileCust.monthly_bill || 0)}/{isBn ? 'মাস' : 'mo'})</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'সংযোগ স্ট্যাটাস:' : 'Connection Status:'}</span> 
                <span className={`font-bold ${viewProfileCust.status === 'Closed' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatStatus(viewProfileCust.status)}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold">
                <span className="text-slate-700">{isBn ? 'বর্তমান হিসাব:' : 'Balance:'}</span> 
                <span className={`font-mono ${Number(viewProfileCust.current_due) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {Number(viewProfileCust.current_due) < 0 
                    ? `+${formatCurrency(Math.abs(viewProfileCust.current_due))} (${isBn ? 'অগ্রিম' : 'Advance'})` 
                    : formatCurrency(viewProfileCust.current_due || 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = viewProfileCust;
                  setViewProfileCust(null);
                  setHistoryCust(target);
                }}
                className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-blue-200 shadow-2xs transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>{isBn ? 'হিস্টরি' : 'History'}</span>
              </button>
              {viewProfileCust.phone && (
                <a
                  href={`tel:${viewProfileCust.phone}`}
                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200 shadow-2xs transition-colors"
                  title={isBn ? 'কল করুন' : 'Call'}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isBn ? 'কল' : 'Call'}</span>
                </a>
              )}
              {viewProfileCust.status === 'Closed' ? (
                <div className="flex-1 py-2.5 px-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl text-center border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isBn ? 'সংযোগ বন্ধ (বিল নেওয়া যাবে না)' : 'Closed (Blocked)'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewProfileCust;
                    setViewProfileCust(null);
                    setCollectCust(target);
                  }}
                  className="flex-1 py-2.5 text-white font-bold text-xs rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{isBn ? 'বিল নিন' : 'Collect Bill'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collect Modal */}
      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchCustomers();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

      {/* Customer Payment History Modal */}
      {historyCust && (
        <CustomerPaymentHistoryModal
          customer={historyCust}
          onClose={() => setHistoryCust(null)}
          onCollect={(cust) => {
            setHistoryCust(null);
            setCollectCust(cust);
          }}
        />
      )}

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
