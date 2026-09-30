import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  X, History, Receipt, Calendar, Clock, User, 
  Wallet, RefreshCw, FileText, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { formatBillingMonth } from '../utils/monthHelper';
import { useLanguage } from '../context/LanguageContext';
import ReceiptModal from './ReceiptModal';

export default function CustomerPaymentHistoryModal({ customer, onClose, onCollect }) {
  const { isBn, formatCurrency } = useLanguage();
  if (!customer) return null;

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getCustomerPayments(customer.id);
      setPayments(data.payments || []);
      setTotalPaid(data.totalPaid || 0);
    } catch (err) {
      console.error(err);
      setError((isBn ? 'পেমেন্ট হিস্টরি লোড করা যায়নি: ' : 'Failed to load payment history: ') + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [customer.id]);

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const rcp = await api.getReceipt(receiptNum);
      setSelectedReceipt(rcp);
    } catch (err) {
      alert((isBn ? 'রশিদ খুলতে সমস্যা হয়েছে: ' : 'Failed to open receipt: ') + err.message);
    }
  };

  const currentDue = Number(customer.current_due) || 0;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-6 max-h-[92vh] flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base leading-tight">{customer.name}</h2>
                  <span className="font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {customer.customer_id}
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  {customer.phone || (isBn ? 'ফোন নেই' : 'No phone')} • {customer.area_name || customer.area || (isBn ? 'এলাকা' : 'Area')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Summary Strip */}
          <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-3 gap-2 text-center shrink-0">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                {isBn ? 'বর্তমান বকেয়া' : 'Current Due'}
              </span>
              <span className={`text-sm sm:text-base font-black font-mono ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(currentDue)}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                {isBn ? 'মোট পরিশোধ' : 'Total Paid'}
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-600">
                {formatCurrency(totalPaid)}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                {isBn ? 'মোট আদায়' : 'Total Collections'}
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-blue-600">
                {payments.length} {isBn ? 'বার' : 'times'}
              </span>
            </div>
          </div>

          {/* Payment List Body */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>{isBn ? 'সকল পূর্ববর্তী পেমেন্ট বিবরণ' : 'All Previous Payment History'} ({payments.length})</span>
              </h3>
              <button
                type="button"
                onClick={fetchPayments}
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span>{isBn ? 'পেমেন্ট হিস্টরি লোড হচ্ছে...' : 'Loading payment history...'}</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {error}
              </div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">{isBn ? 'এই গ্রাহকের কোনো পূর্ববর্তী বিল কালেকশন পাওয়া যায়নি' : 'No previous collection history found for this customer'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{isBn ? 'প্রথমবার বিল গ্রহণ করার পর তা এখানে জমা হবে।' : 'Transactions will appear here once payments are collected.'}</p>
              </div>
            ) : (
              payments.map((p) => (
                <div 
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-blue-300 transition-all space-y-2.5"
                >
                  {/* Row 1: Amount & Date */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-emerald-600">
                          +{formatCurrency(p.paid_amount)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                          {p.payment_method}
                        </span>
                      </div>
                      
                      {/* Billing Month Tag */}
                      {p.billing_month && (
                        <div className="text-[11px] font-semibold text-slate-700 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{isBn ? 'বিলের মাস:' : 'Bill Month:'} <strong className="text-blue-700">{formatBillingMonth(p.billing_month, isBn ? 'bengali' : 'english')}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{p.payment_date}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{p.payment_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Collector & Balance Breakdown */}
                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 font-mono border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-sans font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {isBn ? 'কালেক্টর:' : 'Collector:'}
                      </span>
                      <span className="font-bold text-slate-900 font-sans">{p.collector_name || (isBn ? 'অফিস' : 'Office')}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span className="font-sans">{isBn ? 'পূর্বের বকেয়া:' : 'Previous Due:'}</span>
                      <span>{formatCurrency(p.previous_due)}</span>
                    </div>

                    <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-xs">
                      <span className="font-sans">{isBn ? 'অবশিষ্ট বকেয়া:' : 'Remaining Due:'}</span>
                      <span className={p.remaining_due > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                        {formatCurrency(p.remaining_due)}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Receipt Number & Action */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-blue-600 font-bold">
                      {p.receipt_number}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenReceipt(p.receipt_number)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{isBn ? 'রশিদ দেখুন' : 'View Receipt'}</span>
                    </button>
                  </div>

                  {p.notes && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded">
                      {isBn ? 'নোট:' : 'Note:'} {p.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>

            {onCollect && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCollect(customer);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span>{isBn ? 'বিল আদায় করুন' : 'Collect Payment'}</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Render Receipt Modal if requested */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </>
  );
}
