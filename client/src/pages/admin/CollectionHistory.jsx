import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  Receipt, Calendar, Filter, Wallet, Users, 
  Search, RefreshCw, Eye, Download, CheckCircle2 
} from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';
import { formatBillingMonth } from '../../utils/monthHelper';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';

export default function CollectionHistory() {
  const { isBn, formatCurrency } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalCollection: 0, totalTransactions: 0 });
  const [breakdowns, setBreakdowns] = useState({ collector: [], method: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [collectorId, setCollectorId] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [search, setSearch] = useState('');

  // Dropdown data
  const [collectors, setCollectors] = useState([]);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const loadCollectors = async () => {
    try {
      const cols = await api.getCollectors();
      setCollectors(cols);
    } catch (e) {}
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        date_filter: dateFilter,
        start_date: startDate,
        end_date: endDate,
        collector_id: collectorId,
        payment_method: paymentMethod,
        search,
        limit: 100
      }).toString();

      const res = await api.getPayments(query);
      setPayments(res.payments);
      setSummary(res.summary);
      setBreakdowns(res.breakdowns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollectors();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [dateFilter, collectorId, paymentMethod]);

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    setDateFilter('custom');
    fetchPayments();
  };

  const handleExportExcel = () => {
    if (payments.length === 0) return;
    const rows = payments.map(p => ({
      'Receipt Number': p.receipt_number,
      'Billing Month': p.billing_month || '',
      'Transaction ID': p.transaction_id,
      'Date': p.payment_date,
      'Time': p.payment_time,
      'Customer Name': p.customer_name,
      'Customer Code': p.customer_code,
      'Area': p.area_name || '-',
      'Collector': p.collector_name || 'Office',
      'Method': p.payment_method,
      'Previous Due': p.previous_due,
      'Paid Amount': p.paid_amount,
      'Remaining Due': p.remaining_due,
      'Notes': p.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collections');
    XLSX.writeFile(wb, `Collections_${dateFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const r = await api.getReceipt(receiptNum);
      setActiveReceipt(r);
    } catch (err) {
      alert(isBn ? 'রশিদ লোড করা সম্ভব হয়নি: ' + err.message : 'Could not open receipt: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <span>{isBn ? 'বিল আদায় ও লেনদেনের ইতিহাস' : 'Bill Collection & Transaction History'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'নিরীক্ষাযোগ্য পেমেন্ট রেকর্ড, কালেক্টর অনুযায়ী আদায় এবং ডিজিটাল রশিদ' 
              : 'Audit-grade payment records, collector settlements, and receipts'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={payments.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isBn ? 'এক্সেল এক্সপোর্ট' : 'Export Excel'}</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: 'all', label: isBn ? 'সর্বকাল' : 'All Time' },
            { id: 'today', label: isBn ? 'আজ' : 'Today' },
            { id: 'yesterday', label: isBn ? 'গতকাল' : 'Yesterday' },
            { id: 'this_week', label: isBn ? 'এই সপ্তাহ' : 'This Week' },
            { id: 'this_month', label: isBn ? 'এই মাস' : 'This Month' },
            { id: 'custom', label: isBn ? 'নির্দিষ্ট তারিখ সীমা' : 'Custom Range' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setDateFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all border cursor-pointer ${
                dateFilter === f.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <form onSubmit={handleCustomDateSubmit} className="flex flex-wrap items-center gap-2 pt-2 text-xs border-t border-slate-100">
            <div>
              <span className="text-slate-500 text-[11px] block">{isBn ? 'শুরুর তারিখ' : 'Start Date'}</span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">{isBn ? 'শেষ তারিখ' : 'End Date'}</span>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              className="mt-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
            >
              {isBn ? 'ফিল্টার প্রয়োগ করুন' : 'Apply Filter'}
            </button>
          </form>
        )}

        {/* Collector & Method Filter */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          <select
            value={collectorId}
            onChange={(e) => setCollectorId(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল কালেক্টর' : 'All Collectors'}</option>
            {collectors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল পেমেন্ট মাধ্যম' : 'All Payment Methods'}</option>
            <option value="Cash">{isBn ? 'নগদ (Cash)' : 'Cash'}</option>
            <option value="bKash">{isBn ? 'বিকাশ (bKash)' : 'bKash'}</option>
            <option value="Nagad">{isBn ? 'নগদ (Nagad)' : 'Nagad'}</option>
            <option value="Bank">{isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
            <option value="Other">{isBn ? 'অন্যান্য' : 'Other'}</option>
          </select>
        </div>
      </div>

      {/* Top Aggregations & Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Collected */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isBn ? 'ফিল্টারকৃত মোট আদায়' : 'Total Filtered Collection'}</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatCurrency(summary.totalCollection)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isBn ? `মোট ${summary.totalTransactions}টি লেনদেনে` : `Across ${summary.totalTransactions} transactions`}
          </div>
        </div>

        {/* Collector Breakdown Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-700 mb-2 block">
            {isBn ? 'কালেক্টর অনুযায়ী আদায়' : 'Collector Breakdown'}
          </span>
          <div className="space-y-1.5 max-h-24 overflow-y-auto text-xs">
            {breakdowns.collector.length === 0 ? (
              <span className="text-slate-400">{isBn ? 'কোনো তথ্য নেই' : 'No data'}</span>
            ) : (
              breakdowns.collector.map((b, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-700 truncate max-w-[120px]">{b.collector_name || (isBn ? 'অফিস' : 'Office')}</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(b.total)} ({b.tx_count})</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Method Breakdown Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-700 mb-2 block">
            {isBn ? 'পেমেন্ট মাধ্যম অনুযায়ী বিভাজন' : 'Payment Method Breakdown'}
          </span>
          <div className="space-y-1.5 max-h-24 overflow-y-auto text-xs">
            {breakdowns.method.length === 0 ? (
              <span className="text-slate-400">{isBn ? 'কোনো তথ্য নেই' : 'No data'}</span>
            ) : (
              breakdowns.method.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-700 font-medium">{m.payment_method}</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(m.total)} ({m.tx_count})</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isBn ? 'কোনো লেনদেন তথ্য পাওয়া যায়নি।' : 'No collections found.'}
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{p.customer_name}</div>
                    <div className="text-xs font-mono text-slate-500">{p.customer_code} • {p.area_name || '-'}</div>
                    <div className="text-[11px] text-blue-600 font-mono mt-0.5">{p.receipt_number}</div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-600 block">
                      +{formatCurrency(p.paid_amount)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {p.payment_method}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                  <span>{p.payment_date} {p.payment_time} • {p.collector_name || (isBn ? 'অফিস' : 'Office')}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenReceipt(p.receipt_number)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-xs cursor-pointer"
                  >
                    {isBn ? 'রশিদ দেখুন' : 'View Receipt'}
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
                <th className="p-3.5">{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                <th className="p-3.5">{isBn ? 'রশিদ নম্বর' : 'Receipt No'}</th>
                <th className="p-3.5">{isBn ? 'গ্রাহক' : 'Customer'}</th>
                <th className="p-3.5">{isBn ? 'এলাকা' : 'Area'}</th>
                <th className="p-3.5">{isBn ? 'কালেক্টর' : 'Collector'}</th>
                <th className="p-3.5">{isBn ? 'মাধ্যম' : 'Method'}</th>
                <th className="p-3.5">{isBn ? 'পূর্ব বকেয়া' : 'Prev Due'}</th>
                <th className="p-3.5 font-bold text-emerald-700">{isBn ? 'পরিশোধিত টাকা' : 'Paid Amount'}</th>
                <th className="p-3.5">{isBn ? 'অবশিষ্ট বকেয়া' : 'Remaining'}</th>
                <th className="p-3.5 text-right">{isBn ? 'রশিদ' : 'Receipt'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400">
                    {isBn ? 'নির্বাচিত ফিল্টারের জন্য কোনো লেনদেন পাওয়া যায়নি।' : 'No transactions found for the selected filter.'}
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-700">
                      <div>{p.payment_date}</div>
                      <div className="text-[10px] text-slate-400">{p.payment_time}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-semibold text-blue-600">{p.receipt_number}</div>
                      {p.billing_month && (
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5 font-medium">
                          {formatBillingMonth(p.billing_month, isBn ? 'bengali' : 'english')}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{p.customer_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{p.customer_code}</div>
                    </td>
                    <td className="p-3.5">{p.area_name || '-'}</td>
                    <td className="p-3.5 font-medium text-slate-800">{p.collector_name || (isBn ? 'অফিস' : 'Office')}</td>
                    <td className="p-3.5 font-medium text-slate-700">{p.payment_method}</td>
                    <td className="p-3.5 font-mono text-slate-500">{formatCurrency(p.previous_due)}</td>
                    <td className="p-3.5 font-mono font-black text-emerald-600">+{formatCurrency(p.paid_amount)}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{formatCurrency(p.remaining_due)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(p.receipt_number)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {isBn ? 'রশিদ' : 'Receipt'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
