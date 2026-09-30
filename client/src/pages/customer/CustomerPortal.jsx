import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Tv, Phone, Receipt, FileText, CheckCircle2, 
  AlertCircle, Download, Clock, ShieldCheck, RefreshCw 
} from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';

export default function CustomerPortal() {
  const { user, company } = useAuth();
  const { isBn, formatCurrency, formatStatus } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      if (user && user.customer_id_ref) {
        const res = await api.getCustomer(user.customer_id_ref);
        setProfile(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [user]);

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const r = await api.getReceipt(receiptNum);
      setActiveReceipt(r);
    } catch (err) {
      alert((isBn ? 'ত্রুটি: ' : 'Error: ') + err.message);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <span>{isBn ? 'গ্রাহক অ্যাকাউন্ট লোড হচ্ছে...' : 'Loading customer account...'}</span>
        </div>
      </div>
    );
  }

  const { customer, billingSummary, payments, bills } = profile;

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-24 md:pb-8 max-w-3xl mx-auto">
      
      {/* Account Overview Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/10 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {customer.customer_id}
              </span>
              <span className="text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {formatStatus(customer.status)} {isBn ? 'লাইন' : 'Line'}
              </span>
            </div>
            <h1 className="text-xl font-bold mt-1.5">{customer.name}</h1>
            <p className="text-xs text-blue-200 mt-0.5">{customer.phone} • {customer.area_name}</p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-blue-200 block uppercase font-semibold">
              {isBn ? 'বর্তমান বকেয়া' : 'Current Balance'}
            </span>
            <span className={`text-2xl font-black font-mono ${customer.current_due > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
              {formatCurrency(customer.current_due)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-blue-600/50 flex flex-wrap justify-between items-center text-xs text-blue-100">
          <div>
            {isBn ? 'প্যাকেজ:' : 'Package:'} <strong className="text-white">{customer.package_name}</strong> ({formatCurrency(customer.monthly_bill)}/{isBn ? 'মাস' : 'mo'})
          </div>
          {company?.phone && (
            <a
              href={`tel:${company.phone}`}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBn ? 'অফিসে কল দিন:' : 'Call Office:'} {company.phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* 3 Summary Stats */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">
            {isBn ? 'মাসিক বিল' : 'Monthly Tariff'}
          </span>
          <span className="text-base font-bold font-mono text-slate-800">
            {formatCurrency(customer.monthly_bill)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">
            {isBn ? 'সর্বমোট পরিশোধ' : 'Total Paid to Date'}
          </span>
          <span className="text-base font-bold font-mono text-emerald-600">
            {formatCurrency(billingSummary.total_paid)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">
            {isBn ? 'সর্বশেষ পরিশোধ' : 'Last Payment'}
          </span>
          <span className="text-xs font-bold text-slate-800">
            {billingSummary.last_payment_date || (isBn ? 'নেই' : 'None')}
          </span>
        </div>
      </div>

      {/* Payment History & Digital Receipts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'আমার পরিশোধিত রশিদ' : 'My Payment Receipts'} ({payments.length})</span>
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {isBn ? 'এখনো কোনো পরিশোধিত রশিদ নেই।' : 'No payment receipts yet.'}
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600">{p.receipt_number}</span>
                    <span className="text-[11px] text-slate-500">• {p.payment_date}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {isBn 
                      ? `${p.payment_method} মাধ্যমে পরিশোধ • কালেক্টর: ${p.collector_name || 'অফিস'}` 
                      : `Paid via ${p.payment_method} • Collector: ${p.collector_name || 'Office'}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-600">
                    +{formatCurrency(p.paid_amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenReceipt(p.receipt_number)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {isBn ? 'রশিদ দেখুন' : 'View Receipt'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Monthly Bills History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'মাসিক বিল রেকর্ড' : 'Billing Records'}</span>
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {bills.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {isBn ? 'এখনো কোনো বিল তৈরি হয়নি।' : 'No bills generated yet.'}
            </div>
          ) : (
            bills.map((b) => (
              <div key={b.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 font-mono">{b.billing_month}</span>
                  <div className="text-[11px] text-slate-500">
                    {b.package_name} • {isBn ? 'পূর্বের বকেয়া:' : 'Prev:'} {formatCurrency(b.previous_due)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-slate-900">
                    {isBn ? 'মোট:' : 'Total:'} {formatCurrency(b.total_due)}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {formatStatus(b.status)}
                  </span>
                </div>
              </div>
            ))
          )}
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
