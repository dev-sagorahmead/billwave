import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  Receipt, Calendar, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldCheck, Loader2, RefreshCw, FileText, Ban 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function BillingGeneration() {
  const { isBn, formatCurrency } = useLanguage();
  const currentMonthStr = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [preview, setPreview] = useState(null);
  const [billsHistory, setBillsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [autoStatus, setAutoStatus] = useState(null);
  const [triggeringAuto, setTriggeringAuto] = useState(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [prevData, histData, statusData] = await Promise.all([
        api.getBillingPreview(selectedMonth),
        api.getBillingHistory(`month=${selectedMonth}`),
        api.getAutoBillingStatus().catch(() => null)
      ]);
      setPreview(prevData);
      setBillsHistory(histData.bills);
      if (statusData) setAutoStatus(statusData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [selectedMonth]);

  const handleTriggerAutoBilling = async () => {
    if (!confirm(isBn ? 'আপনি কি নিশ্চিত যে বর্তমান মাসের জন্য সকল সক্রিয় গ্রাহকদের অটো-বিলিং রান করতে চান?' : 'Are you sure you want to run auto-billing for all active subscribers for the current month?')) return;
    try {
      setTriggeringAuto(true);
      const res = await api.triggerAutoBilling(selectedMonth);
      setResultMessage(res.message);
      setTimeout(() => setResultMessage(''), 7000);
      fetchBillingData();
    } catch (err) {
      alert(isBn ? 'অটো-বিলিং রান ব্যর্থ হয়েছে: ' + err.message : 'Auto billing run failed: ' + err.message);
    } finally {
      setTriggeringAuto(false);
    }
  };

  const handleGenerateBills = async () => {
    if (!preview) return;
    if (preview.pendingCount === 0) {
      alert(isBn 
        ? `${selectedMonth} মাসের জন্য সকল সক্রিয় গ্রাহকের বিল ইতোমধ্যে তৈরি হয়েছে। ডুপ্লিকেট বিল তৈরি রোধ করা হয়েছে।` 
        : `All eligible active customers have already been billed for month ${selectedMonth}. Duplicate generation prevented.`);
      return;
    }

    if (!confirm(isBn 
      ? `মাস ${selectedMonth} এর জন্য ${preview.pendingCount} জন সক্রিয় গ্রাহকের বিল তৈরি করবেন? মোট বিল: ${formatCurrency(preview.totalPendingAmount)}`
      : `Generate monthly bills for ${preview.pendingCount} active customer(s) for billing cycle ${selectedMonth}? Total amount: ${formatCurrency(preview.totalPendingAmount)}`)) {
      return;
    }

    try {
      setGenerating(true);
      const res = await api.generateBills(selectedMonth);
      setResultMessage(res.message);
      setTimeout(() => setResultMessage(''), 6000);
      fetchBillingData();
    } catch (err) {
      alert(isBn ? 'বিল তৈরি ব্যর্থ হয়েছে: ' + err.message : 'Billing generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <span>{isBn ? 'স্বয়ংক্রিয় মাসিক বিল জেনারেটর' : 'Automated Monthly Billing Generator'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'ডুপ্লিকেট প্রতিরোধ ও সক্রিয় লাইনের ভিত্তিতে মাসিক প্যাকেজ বিল ধার্যকরণ' 
              : 'Auto-generate monthly package bills with strict duplicate prevention and tenant isolation'}
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">{isBn ? 'বিলিং সাইকেল:' : 'Billing Cycle:'}</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {resultMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{resultMessage}</span>
        </div>
      )}

      {/* 1st of Month Automated Billing Status Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-2xl p-6 shadow-md border border-indigo-700/50 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-indigo-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  {isBn ? 'প্রতি মাসের ১ তারিখে অটো বিলিং সক্রিয়' : 'Automated 1st-of-Month Billing System'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {isBn ? 'চালু আছে (ACTIVE)' : 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                {isBn 
                  ? 'মাসের ১ তারিখ রাত ১২:০১ মিনিটে সকল সক্রিয় গ্রাহকের বিল স্বয়ংক্রিয়ভাবে ধার্য হবে' 
                  : 'On the 1st of each month at 12:01 AM, monthly package bills are auto-generated'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={triggeringAuto}
            onClick={handleTriggerAutoBilling}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold border border-indigo-400/30 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {triggeringAuto ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isBn ? 'অটো বিলিং প্রসেস হচ্ছে...' : 'Processing Auto Billing...'}</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{isBn ? 'টেস্ট / এখনই অটো বিল রান করুন' : 'Trigger Auto Billing Now'}</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-100">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-indigo-300 text-[11px] block">{isBn ? 'বিলিং নিয়ম:' : 'Billing Rule:'}</span>
            <span className="font-semibold text-white">{isBn ? 'শুধুমাত্র সক্রিয় (Active) লাইন বিল হবে' : 'Active Lines Only'}</span>
            <span className="text-[10px] text-indigo-300 block mt-0.5">{isBn ? 'বন্ধ (Closed) লাইন বিল হবে না' : 'Closed lines are excluded'}</span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-indigo-300 text-[11px] block">{isBn ? 'পরবর্তী অটো বিল সাইকেল:' : 'Next Auto Run:'}</span>
            <span className="font-mono font-bold text-emerald-300 text-sm">
              {autoStatus?.nextRunDate || (isBn ? 'পরবর্তী মাসের ১ তারিখ' : '1st of next month')}
            </span>
            <span className="text-[10px] text-indigo-300 block mt-0.5">{isBn ? 'রাত ১২:০১ মিনিটে স্বয়ংক্রিয় রান' : 'Runs automatically at 12:01 AM'}</span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-indigo-300 text-[11px] block">{isBn ? 'সর্বশেষ অটো বিল রান:' : 'Last Auto Run:'}</span>
            <span className="font-semibold text-white">
              {autoStatus?.lastRunMonth ? `${autoStatus.lastRunMonth}` : (isBn ? 'এখনও রান হয়নি' : 'Not yet run')}
            </span>
            <span className="text-[10px] text-indigo-300 block mt-0.5">{isBn ? 'ডুপ্লিকেট প্রতিরোধ সক্রিয়' : 'Duplicate protection active'}</span>
          </div>
        </div>
      </div>

      {/* Strict System Rules Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs space-y-2 text-blue-950">
        <div className="font-bold flex items-center gap-2 text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>{isBn ? 'স্বয়ংক্রিয় বিলিং নিয়মাবলি ও নিরাপত্তা' : 'Automated Billing Rules & Safeguards'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-blue-900 pt-1">
          <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100">
            <strong>{isBn ? '১. সক্রিয় লাইন মাত্র:' : '1. Active Paid Lines Only:'}</strong> {isBn ? 'কেবলমাত্র সক্রিয় গ্রাহকদের প্যাকেজ মূল্য চলতি বকেয়ার সাথে যুক্ত হয়।' : 'Automatically adds package price to outstanding balance for active paid subscribers.'}
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100">
            <strong>{isBn ? '২. ডুপ্লিকেট বিলিং প্রতিরোধ:' : '2. Duplicate Prevention:'}</strong> {isBn ? `${selectedMonth} মাসের বিদ্যমান রেকর্ড যাচাই করে দ্বৈত বিল সম্পূর্ণ ব্লক রাখা হয়।` : `System checks existing billing records for ${selectedMonth}. Duplicate generation is strictly blocked!`}
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100">
            <strong>{isBn ? '৩. ফ্রি ও বন্ধ লাইন:' : '3. Free & Closed Customers:'}</strong> {isBn ? 'বন্ধ এবং ফ্রি গ্রাহকদের থেকে কোনো নতুন বিল ধার্য হয় না; তবে পূর্ব বকেয়া অপরিবর্তিত থাকে।' : 'Closed and Free lines are excluded from monthly bills. Any existing dues remain frozen and payable.'}
          </div>
        </div>
      </div>

      {/* Billing Stats & Trigger Card */}
      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isBn ? `বিলিং সাইকেল: ${selectedMonth} এর অবস্থা` : `Billing Cycle: ${selectedMonth} Status Overview`}
              </h2>
              <p className="text-xs text-slate-500">
                {isBn ? 'চলতি ক্যালেন্ডার মাসের জন্য গ্রাহক যোগ্যতা ও বিলিং অগ্রগতি' : 'Calculated eligibility and generation progress for this calendar month'}
              </p>
            </div>

            <button
              type="button"
              disabled={preview.pendingCount === 0 || generating}
              onClick={handleGenerateBills}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBn ? 'বিল তৈরি হচ্ছে...' : 'Generating Bills...'}</span>
                </>
              ) : preview.pendingCount === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isBn ? 'সকল সক্রিয় গ্রাহকের বিল সম্পন্ন' : 'All Active Customers Billed'}</span>
                </>
              ) : (
                <>
                  <span>{isBn ? `বিল তৈরি করুন (${preview.pendingCount} জন বাকি)` : `Generate Bills (${preview.pendingCount} Pending)`}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">{isBn ? 'মোট সক্রিয় গ্রাহক' : 'Total Active Eligible'}</span>
              <span className="text-xl font-bold text-slate-900">{preview.totalEligible}</span>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block">{isBn ? 'বিল ইতোমধ্যে ধার্যকৃত' : 'Already Billed'}</span>
              <span className="text-xl font-bold text-emerald-700">{preview.alreadyBilledCount}</span>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
              <span className="text-amber-700 block">{isBn ? 'বিল বাকি আছে' : 'Pending to Bill'}</span>
              <span className="text-xl font-bold text-amber-700">{preview.pendingCount}</span>
            </div>

            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
              <span className="text-blue-700 block">{isBn ? 'বাকি বিলের পরিমাণ' : 'Pending Bill Amount'}</span>
              <span className="text-xl font-bold font-mono text-blue-700">
                {formatCurrency(preview.totalPendingAmount)}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">{isBn ? 'বাদ দেওয়া লাইন' : 'Excluded Lines'}</span>
              <span className="text-xs font-medium text-slate-600 mt-1 block">
                {preview.closedCustomerCount} {isBn ? 'বন্ধ' : 'Closed'} • {preview.freeCustomerCount} {isBn ? 'ফ্রি' : 'Free'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Generated Bills Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>
              {isBn 
                ? `${selectedMonth} মাসের ধার্যকৃত বিলের রেকর্ড (${billsHistory.length})` 
                : `Generated Bill Records for ${selectedMonth} (${billsHistory.length})`}
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">{isBn ? 'গ্রাহক আইডি' : 'Customer ID'}</th>
                <th className="p-3.5">{isBn ? 'গ্রাহকের নাম ও ফোন' : 'Customer Name & Phone'}</th>
                <th className="p-3.5">{isBn ? 'এলাকা' : 'Area'}</th>
                <th className="p-3.5">{isBn ? 'প্যাকেজ' : 'Package'}</th>
                <th className="p-3.5">{isBn ? 'ধার্যকৃত বিল' : 'Bill Amount'}</th>
                <th className="p-3.5">{isBn ? 'পূর্ব বকেয়া' : 'Previous Due'}</th>
                <th className="p-3.5 font-bold text-slate-900">{isBn ? 'মোট বকেয়া' : 'Total Due'}</th>
                <th className="p-3.5">{isBn ? 'বিল তৈরির সময়' : 'Generated At'}</th>
                <th className="p-3.5">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billsHistory.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    {isBn 
                      ? `${selectedMonth} মাসের কোনো বিল এখনও তৈরি হয়নি। উপরে "বিল তৈরি করুন" চাপুন।` 
                      : `No bills generated yet for cycle ${selectedMonth}. Click "Generate Bills" above.`}
                  </td>
                </tr>
              ) : (
                billsHistory.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{b.cust_code}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{b.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{b.customer_phone}</div>
                    </td>
                    <td className="p-3.5">{b.area_name || '-'}</td>
                    <td className="p-3.5">{b.package_name}</td>
                    <td className="p-3.5 font-mono font-bold text-blue-600">+{formatCurrency(b.amount)}</td>
                    <td className="p-3.5 font-mono text-slate-500">{formatCurrency(b.previous_due)}</td>
                    <td className="p-3.5 font-mono font-black text-slate-900">{formatCurrency(b.total_due)}</td>
                    <td className="p-3.5 text-[11px] text-slate-500">{b.generated_at}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        b.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {b.status === 'Paid' ? (isBn ? 'পরিশোধিত' : 'Paid') :
                         b.status === 'Partially Paid' ? (isBn ? 'আংশিক পরিশোধ' : 'Partially Paid') :
                         (isBn ? 'ধার্যকৃত' : 'Billed')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
