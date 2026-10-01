import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import confetti from 'canvas-confetti';
import { X, Wallet, Check, AlertCircle, ArrowRight, Loader2, Calendar, Clock, History } from 'lucide-react';
import { getDefaultArrearsMonth, getBillingMonthOptions, formatBillingMonth } from '../utils/monthHelper';
import CustomerPaymentHistoryModal from './CustomerPaymentHistoryModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function PaymentModal({ customer, onSuccess, onClose }) {
  const { user } = useAuth();
  const { isBn, formatCurrency } = useLanguage();
  if (!customer) return null;

  const isCollector = user?.role === 'collector';
  const isClosed = customer.status === 'Closed';
  const currentDue = Number(customer.current_due) || 0;
  const monthlyBill = Number(customer.monthly_bill) || 150;

  // Calculate initial cooldown seconds based on customer.last_payment_created_at or localStorage
  const getInitialCooldown = () => {
    let lastTimeMs = null;

    if (customer.last_payment_created_at) {
      lastTimeMs = new Date(customer.last_payment_created_at.replace(' ', 'T') + 'Z').getTime();
    }

    try {
      const localStored = localStorage.getItem(`dish_last_pay_${customer.id}`);
      if (localStored) {
        const localTimeMs = Number(localStored);
        if (!lastTimeMs || localTimeMs > lastTimeMs) {
          lastTimeMs = localTimeMs;
        }
      }
    } catch (e) {}

    if (lastTimeMs) {
      const elapsed = Math.floor((Date.now() - lastTimeMs) / 1000);
      if (elapsed >= 0 && elapsed < 120) {
        return 120 - elapsed;
      }
    }
    return 0;
  };

  const [cooldownSeconds, setCooldownSeconds] = useState(getInitialCooldown());
  const [billingMonth, setBillingMonth] = useState(getDefaultArrearsMonth());
  const [amount, setAmount] = useState(currentDue > 0 ? currentDue : monthlyBill);
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 2-minute Cooldown timer ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatCooldownTime = (totalSec) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(min)}:${pad(sec)}`;
  };

  const numAmount = Number(amount) || 0;
  const isOverpaying = numAmount > currentDue;
  const remainingDue = Math.max(0, Number((currentDue - numAmount).toFixed(2)));

  const handleQuickAmount = (val) => {
    setAmount(val);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError(isBn ? 'অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন (কমপক্ষে ১ টাকা)' : 'Please enter a valid amount (at least 1 BDT)');
      return;
    }

    // Strict validation: Collector cannot collect more than outstanding due balance
    // Requirement: "গ্রাহকের যে বকেয়া আছে তা ছাড়া বেশি পরিমান টাকা বশিয়ে বিল কালেক্ট করে তাহলে বিল কালেক্ট হবে না । সাথে সাথে তাকে মেসেজ দিবে যে আপনি টাকা বেশি লিখেছেন"
    if (isOverpaying) {
      const overMsg = isBn 
        ? `আপনি টাকা বেশি লিখেছেন! গ্রাহকের বকেয়া আছে ${currentDue} টাকা। বকেয়ার চেয়ে বেশি টাকা গ্রহণ করা যাবে না।`
        : `You entered excess amount! Customer due is ${currentDue} BDT. You cannot collect more than the due amount.`;
      setError(overMsg);
      alert(isBn
        ? `⚠️ আপনি টাকা বেশি লিখেছেন!\n\nগ্রাহক: ${customer.name} (${customer.customer_id})\nবর্তমান বকেয়া: ${currentDue} টাকা\nআপনি লিখেছেন: ${numAmount} টাকা\n───────────────────────────────\nবকেয়ার চেয়ে বেশি টাকা দিয়ে বিল আদায় করা যাবে না। অনুগ্রহ করে সঠিক পরিমাণ লিখুন।`
        : `⚠️ Excess amount entered!\n\nCustomer: ${customer.name} (${customer.customer_id})\nCurrent Due: ${currentDue} BDT\nYou entered: ${numAmount} BDT\n───────────────────────────────\nCannot collect more than the outstanding balance. Please enter the correct amount.`
      );
      return;
    }

    // Strict validation: Collector cannot collect bill from closed customers
    // Requirement: "গ্রাহক বন্ধ থাকলে কালেক্টর ঐ গ্রাহকের বিল নিতে পারবে না। গ্রাহক একটিভ করতে পারবে কোম্পানির এডমিন।"
    if (isCollector && isClosed) {
      const closedMsg = isBn
        ? 'এই গ্রাহকের সংযোগ বন্ধ (Closed) রয়েছে। কালেক্টর বন্ধ গ্রাহকের বিল নিতে পারবেন না। কোম্পানির এডমিন একটিভ করার পর বিল নেওয়া যাবে।'
        : 'Customer connection is Closed. Collector cannot collect bill from closed customers. Company admin must activate first.';
      setError(closedMsg);
      alert(isBn
        ? `⚠️ গ্রাহকের সংযোগ বন্ধ!\n\nগ্রাহক: ${customer.name} (${customer.customer_id})\n\nকালেক্টর বন্ধ গ্রাহকের বিল নিতে পারবেন না। কোম্পানির এডমিন এই গ্রাহককে একটিভ (Active) করার পর বিল গ্রহণ করা যাবে।`
        : `⚠️ Customer connection is closed!\n\nCustomer: ${customer.name} (${customer.customer_id})\n\nCollector cannot collect bill from closed subscribers. Bill can be collected once Company Admin activates this customer.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.collectPayment({
        customer_id: customer.id,
        paid_amount: numAmount,
        payment_method: method,
        billing_month: billingMonth,
        notes
      });

      // Save last payment timestamp to activate instant local cooldown
      try {
        localStorage.setItem(`dish_last_pay_${customer.id}`, Date.now().toString());
      } catch (e) {}

      // Confetti celebration
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (err) {}

      onSuccess(res.receipt || res);
    } catch (err) {
      if (err.data?.remainingSeconds) {
        setCooldownSeconds(err.data.remainingSeconds);
      }
      setError(err.message || (isBn ? 'বিল সংগ্রহ ব্যর্থ হয়েছে' : 'Payment collection failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Header - Compact with prominent Close Button */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/15 rounded-lg shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">
                {isBn ? 'বিল আদায়' : 'Collect Payment'}
              </h2>
              <p className="text-[11px] text-blue-100 font-mono mt-0.5">
                {customer.customer_id} • {customer.name}
              </p>
            </div>
          </div>
          
          {/* Prominent High-Contrast Close Icon Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-white/20 hover:bg-white/35 active:scale-95 text-white rounded-full transition-all flex items-center justify-center shadow-xs border border-white/25"
            title={isBn ? 'বন্ধ করুন' : 'Close'}
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Customer Quick Info Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              {isBn ? 'বর্তমান বকেয়া' : 'Current Due'}
            </span>
            <span className={`text-base font-bold font-mono ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(currentDue)}
            </span>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-[11px] text-slate-600 font-medium">
              {isBn ? `মাসিক: ${monthlyBill} ৳` : `Monthly: ${monthlyBill} BDT`}
            </span>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 py-0.5 px-2 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors shadow-2xs"
              title={isBn ? 'পূর্বের বিল হিস্টরি' : 'History'}
            >
              <History className="w-3 h-3 text-blue-600" />
              <span>{isBn ? 'হিস্টরি' : 'History'}</span>
            </button>
          </div>
        </div>

        {/* Payment Form - Compact & Scrollable */}
        <form onSubmit={handleSubmit} className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
          
          {/* Closed Customer Warning for Collectors */}
          {isCollector && isClosed && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight">
                <strong className="text-rose-950 block">{isBn ? 'সংযোগ বন্ধ' : 'Disconnected'}</strong>
                {isBn 
                  ? 'গ্রাহক বন্ধ থাকায় কালেক্টর বিল নিতে পারবেন না।' 
                  : 'Customer line closed. Collector cannot collect.'}
              </div>
            </div>
          )}

          {/* 2-Minute Anti-Duplicate Cooldown Alert Banner */}
          {cooldownSeconds > 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <span className="text-[11px] font-semibold">{isBn ? 'ডাবল পেমেন্ট সুরক্ষা:' : 'Duplicate guard:'}</span>
              </div>
              <span className="font-mono px-2 py-0.5 bg-amber-200 text-amber-950 rounded font-black text-xs">
                {formatCooldownTime(cooldownSeconds)}
              </span>
            </div>
          )}

          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span className="text-[11px] leading-tight">{error}</span>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500">{isBn ? 'শর্টকাট:' : 'Quick:'}</span>
            {currentDue > 0 && (
              <button
                type="button"
                onClick={() => handleQuickAmount(currentDue)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                  amount === currentDue 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isBn ? `পূর্ণ (${formatCurrency(currentDue)})` : `Full (${formatCurrency(currentDue)})`}
              </button>
            )}

            {monthlyBill > 0 && monthlyBill !== currentDue && (
              <button
                type="button"
                onClick={() => handleQuickAmount(monthlyBill)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                  amount === monthlyBill 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isBn ? `১ মাস (${formatCurrency(monthlyBill)})` : `1 Mo (${formatCurrency(monthlyBill)})`}
              </button>
            )}

            {currentDue > 200 && (
              <button
                type="button"
                onClick={() => handleQuickAmount(Math.round(currentDue / 2))}
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {isBn ? `অর্ধেক (${formatCurrency(Math.round(currentDue / 2))})` : `Half (${formatCurrency(Math.round(currentDue / 2))})`}
              </button>
            )}
          </div>

          {/* 2-Column: Billing Month & Payment Method */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="billing-month" className="block text-[11px] font-semibold text-slate-700 mb-1">
                {isBn ? 'বিলের মাস' : 'Month'} *
              </label>
              <select
                id="billing-month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {getBillingMonthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {formatBillingMonth(opt.value, isBn ? 'bengali' : 'english')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {isBn ? 'মাধ্যম' : 'Method'} *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Cash">{isBn ? 'নগদ ক্যাশ' : 'Cash'}</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank">{isBn ? 'ব্যাংক' : 'Bank'}</option>
              </select>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label htmlFor="pay-amount" className="block text-[11px] font-semibold text-slate-700 mb-1">
              {isBn ? 'পরিশোধিত টাকার পরিমাণ' : 'Amount'} ({isBn ? 'টাকা' : 'BDT'}) *
            </label>
            <div className="relative">
              <input
                id="pay-amount"
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-3 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-base font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs"
                placeholder={isBn ? 'টাকা লিখুন' : 'Enter amount'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                {isBn ? 'টাকা' : 'BDT'}
              </span>
            </div>
          </div>

          {/* Live Due Calculation Preview - Compact */}
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-[11px] space-y-1">
            <div className="flex justify-between items-center text-slate-600">
              <span>{isBn ? 'আদায় করা হচ্ছে:' : 'Collecting:'} <strong className="font-mono text-blue-700">{formatCurrency(numAmount)}</strong></span>
              <span>{isBn ? 'অবশিষ্ট বকেয়া:' : 'Remaining:'} <strong className={`font-mono font-bold ${remainingDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(remainingDue)}</strong></span>
            </div>
            {isOverpaying && (
              <div className="flex justify-between items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                <span>{isBn ? '⚠️ অতিরিক্ত টাকা:' : '⚠️ Excess:'}</span>
                <span className="font-mono">+{formatCurrency(Number((numAmount - currentDue).toFixed(2)))}</span>
              </div>
            )}
          </div>

          {/* Overpayment Warning Card */}
          {isOverpaying && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs space-y-1 text-rose-900 shadow-xs">
              <div className="flex items-center gap-1 font-bold text-rose-950 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{isBn ? 'আপনি টাকা বেশি লিখেছেন!' : 'Excess amount!'}</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-tight">
                {isBn 
                  ? `বকেয়া আছে ${currentDue} ৳। বকেয়ার চেয়ে বেশি টাকা গ্রহণ করা যাবে না।`
                  : `Due is ${currentDue} BDT. Cannot collect more than due.`}
              </p>
              <button
                type="button"
                onClick={() => setAmount(currentDue)}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] transition-colors"
              >
                {isBn ? `সঠিক বকেয়া (${currentDue} ৳) সেট করুন` : `Set Exact Due (${currentDue})`}
              </button>
            </div>
          )}

          {/* Notes (Optional) */}
          <div>
            <input
              id="pay-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isBn ? 'নোট / বিবরণ (ঐচ্ছিক)' : 'Notes (optional)'}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons: Cancel and Confirm */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors border border-slate-300 shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting || numAmount <= 0 || isOverpaying || cooldownSeconds > 0 || (isCollector && isClosed)}
              className={`flex-1 py-2.5 px-3 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                (isCollector && isClosed) || isOverpaying
                  ? 'bg-rose-600 opacity-90 cursor-not-allowed shadow-rose-600/20'
                  : cooldownSeconds > 0
                  ? 'bg-amber-600 opacity-90 cursor-not-allowed shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 shadow-emerald-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBn ? 'প্রসেসিং...' : 'Processing...'}</span>
                </>
              ) : isCollector && isClosed ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-white" />
                  <span>{isBn ? 'সংযোগ বন্ধ' : 'Closed'}</span>
                </>
              ) : isOverpaying ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>{isBn ? 'টাকা বেশি লিখেছেন' : 'Excess Amount'}</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>{isBn ? `অপেক্ষা (${formatCooldownTime(cooldownSeconds)})` : `Wait (${formatCooldownTime(cooldownSeconds)})`}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isBn ? `আদায় নিশ্চিত (${formatCurrency(numAmount)})` : `Confirm (${formatCurrency(numAmount)})`}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* Customer Payment History Modal */}
      {showHistoryModal && (
        <CustomerPaymentHistoryModal
          customer={customer}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
