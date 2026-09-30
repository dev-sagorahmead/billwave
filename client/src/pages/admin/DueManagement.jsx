import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, Search, Phone, Wallet, Eye, 
  ArrowUpDown, Filter, RefreshCw, CheckCircle 
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';
import { useLanguage } from '../../context/LanguageContext';

export default function DueManagement() {
  const { isBn, formatCurrency } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Due category filters
  const [dueType, setDueType] = useState('has_due');
  const [sortBy, setSortBy] = useState('highest_due');
  const [search, setSearch] = useState('');

  // Modals
  const [collectCust, setCollectCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        due_type: dueType,
        sort_by: sortBy,
        search,
        limit: 100
      }).toString();

      const res = await api.getCustomers(query);
      setCustomers(res.customers);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching due list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, [dueType, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDues();
  };

  const categories = [
    { id: 'has_due', label: isBn ? 'সকল বকেয়া' : 'All Due', count: total },
    { id: '1_month', label: isBn ? '১ মাসের বকেয়া' : '1 Month Due' },
    { id: '2_months', label: isBn ? '২ মাসের বকেয়া' : '2 Months Due' },
    { id: '3_plus_months', label: isBn ? '৩+ মাসের বকেয়া' : '3+ Months Due' },
    { id: 'partial_due', label: isBn ? 'আংশিক বকেয়া' : 'Partial Due' },
    { id: 'high_due', label: isBn ? 'বেশি বকেয়া (>৫০০ টাকা)' : 'High Due (>500 BDT)' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{isBn ? 'বকেয়া বিল ব্যবস্থাপনা' : 'Outstanding Due Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'বকেয়া থাকা গ্রাহকদের তালিকা, আদায়ের অগ্রাধিকার নির্ধারণ ও বকেয়া বিল রিকভারি'
              : 'Identify overdue subscribers, prioritize collection, and recover outstanding bills'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-500 block">{isBn ? 'মোট বকেয়া গ্রাহক:' : 'Subscribers with Due:'}</span>
          <span className="text-xl font-black text-rose-600 font-mono">
            {total} {isBn ? 'জন' : 'Customers'}
          </span>
        </div>
      </div>

      {/* Due Categories Navigation Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setDueType(cat.id)}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border cursor-pointer ${
              dueType === cat.id
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/25'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search and Sorting */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? 'গ্রাহকের নাম, মোবাইল বা আইডি দিয়ে খুঁজুন...' : 'Search by customer name, phone, or ID...'}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 whitespace-nowrap">{isBn ? 'বাছাই:' : 'Sort By:'}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="highest_due">{isBn ? 'সর্বোচ্চ বকেয়া আগে' : 'Highest Due First'}</option>
            <option value="lowest_due">{isBn ? 'সর্বনিম্ন বকেয়া আগে' : 'Lowest Due First'}</option>
            <option value="latest_payment">{isBn ? 'সাম্প্রতিক পেমেন্টের তারিখ' : 'Latest Payment Date'}</option>
            <option value="area_asc">{isBn ? 'এলাকা অনুসারে' : 'Area Wise'}</option>
          </select>
        </div>
      </div>

      {/* Due Customer Table & Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {customers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isBn ? 'এই ক্যাটাগরিতে কোনো বকেয়া গ্রাহক নেই!' : 'No outstanding dues found in this category!'}
            </div>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="p-4 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{c.customer_id} • {c.phone}</div>
                    <div className="text-[11px] text-slate-400">
                      {c.area_name || '-'} • {c.package_name} ({formatCurrency(c.monthly_bill)})
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono text-rose-600 block">
                      {formatCurrency(c.current_due)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isBn ? 'সর্বশেষ আদায়: ' : 'Last paid: '}
                      {c.last_payment_date || (isBn ? 'কখনও দেয়নি' : 'Never')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                    title={isBn ? 'কল করুন' : 'Call Customer'}
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setCollectCust(c)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                  >
                    {isBn ? 'বিল আদায়' : 'Collect Bill'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/customers/${c.id}`)}
                    className="p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title={isBn ? 'প্রোফাইল দেখুন' : 'View Profile'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">{isBn ? 'গ্রাহক আইডি' : 'Customer ID'}</th>
                <th className="p-3.5">{isBn ? 'গ্রাহকের নাম ও ফোন' : 'Customer Name & Contact'}</th>
                <th className="p-3.5">{isBn ? 'এলাকা' : 'Area'}</th>
                <th className="p-3.5">{isBn ? 'প্যাকেজ' : 'Package'}</th>
                <th className="p-3.5">{isBn ? 'মাসিক বিল' : 'Monthly Bill'}</th>
                <th className="p-3.5 font-bold text-rose-700">{isBn ? 'বকেয়া পরিমাণ' : 'Due Amount'}</th>
                <th className="p-3.5">{isBn ? 'সর্বশেষ পেমেন্ট' : 'Last Payment Date'}</th>
                <th className="p-3.5 text-right">{isBn ? 'দ্রুত আদায়' : 'Quick Collect'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    {isBn ? 'এই ক্যাটাগরিতে কোনো বকেয়া গ্রাহক তথ্য পাওয়া যায়নি।' : 'No customers found with outstanding dues in this category.'}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{c.customer_id}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.phone}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{c.area_name || '-'}</td>
                    <td className="p-3.5">{c.package_name}</td>
                    <td className="p-3.5 font-mono font-semibold text-slate-800">{formatCurrency(c.monthly_bill)}</td>
                    <td className="p-3.5 font-mono font-black text-rose-600 text-sm">{formatCurrency(c.current_due)}</td>
                    <td className="p-3.5 text-[11px] text-slate-500">{c.last_payment_date || (isBn ? 'কখনও দেয়নি' : 'Never')}</td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <a
                        href={`tel:${c.phone}`}
                        className="p-1.5 inline-block text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title={isBn ? 'কল করুন' : 'Call Customer'}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setCollectCust(c)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                      >
                        {isBn ? 'বিল আদায়' : 'Collect'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="p-1.5 inline-block text-slate-500 hover:text-blue-600 cursor-pointer"
                        title={isBn ? 'প্রোফাইল দেখুন' : 'View Profile'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Collect Modal */}
      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchDues();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

      {/* Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

    </div>
  );
}
