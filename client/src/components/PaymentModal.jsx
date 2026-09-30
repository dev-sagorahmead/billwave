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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">
                {isBn ? 'বিল আদায় করুন' : 'Collect Bill Payment'}
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                {isBn ? 'সহজ ও দ্রুত বিল সংগ্রহ' : 'Quick touch mobile collection'}
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

        {/* Customer Info Card */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{customer.name}</span>
                <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  {customer.customer_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{customer.phone} • {customer.area_name || customer.area || (isBn ? 'প্রধান এলাকা' : 'Main Area')}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                {isBn ? 'বর্তমান বকেয়া' : 'Outstanding Due'}
              </span>
              <span className={`text-lg font-bold font-mono ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(currentDue)}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 py-1 px-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>{isBn ? 'পূর্বের বিল হিস্টরি দেখুন' : 'View Payment History'}</span>
            </button>
            <span className="text-[11px] text-slate-500 font-medium">
              {isBn ? `মাসিক বিল: ${monthlyBill} ৳` : `Monthly Bill: ${monthlyBill} BDT`}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Closed Customer Warning for Collectors */}
          {isCollector && isClosed && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-950">
                  {isBn ? 'সংযোগ বন্ধ (গ্রাহক নিষ্ক্রিয়)' : 'Disconnected Line (Closed Subscriber)'}
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  {isBn 
                    ? 'এই গ্রাহকের সংযোগ বন্ধ আছে। কোম্পানির এডমিন একটিভ না করা পর্যন্ত কালেক্টর বন্ধ গ্রাহকের বিল আদায় করতে পারবেন না।'
                    : 'This customer line is closed. Collectors cannot collect bill until Company Admin activates this customer.'}
                </p>
              </div>
            </div>
          )}

          {/* 2-Minute Anti-Duplicate Cooldown Alert Banner */}
          {cooldownSeconds > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="font-bold flex items-center justify-between text-amber-950">
                  <span>{isBn ? 'ডাবল পেমেন্ট সুরক্ষা সক্রিয়' : 'Double Payment Guard Active'}</span>
                  <span className="font-mono px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md font-black text-xs">
                    {formatCooldownTime(cooldownSeconds)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  {isBn 
                    ? 'এই গ্রাহকের বিল মাত্র গ্রহণ করা হয়েছে। ভুলবশত একই বিল একাধিকবার এন্ট্রি রোধ করতে অনুগ্রহ করে ২ মিনিট অপেক্ষা করুন।'
                    : 'Payment was just collected for this customer. Please wait 2 minutes to prevent duplicate entry.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Amount Suggestion Badges */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {isBn ? 'দ্রুত শর্টকাট' : 'Quick Payment Shortcuts'}
            </label>
            <div className="flex flex-wrap gap-2">
              {currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(currentDue)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    amount === currentDue 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isBn ? `পূর্ণ বকেয়া (${formatCurrency(currentDue)})` : `Full Due (${formatCurrency(currentDue)})`}
                </button>
              )}

              {monthlyBill > 0 && monthlyBill !== currentDue && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(monthlyBill)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    amount === monthlyBill 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isBn ? `১ মাস (${formatCurrency(monthlyBill)})` : `1 Month (${formatCurrency(monthlyBill)})`}
                </button>
              )}

              {currentDue > 200 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(Math.round(currentDue / 2))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {isBn ? `অর্ধেক (${formatCurrency(Math.round(currentDue / 2))})` : `Half (${formatCurrency(Math.round(currentDue / 2))})`}
                </button>
              )}
            </div>
          </div>

          {/* Billing Month Selection (Cable TV standard: 1 month in arrears) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="billing-month" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                {isBn ? 'বিলের মাস' : 'Billing Month'} *
              </label>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {formatBillingMonth(billingMonth, isBn ? 'bengali' : 'english')}
              </span>
            </div>
            <select
              id="billing-month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
            >
              {getBillingMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {formatBillingMonth(opt.value, isBn ? 'bengali' : 'english')}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn 
                ? '* ১ মাস বকেয়া বিলের নিয়ম অনুযায়ী স্বয়ংক্রিয়ভাবে গত মাস নির্বাচিত'
                : '* Auto-selected based on 1-month arrears billing standard'}
            </p>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label htmlFor="pay-amount" className="block text-xs font-semibold text-slate-700 mb-1">
              {isBn ? 'পরিশোধিত টাকার পরিমাণ' : 'Payment Amount'} ({isBn ? 'টাকা' : 'BDT'}) *
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
                className="w-full pl-4 pr-16 py-3 bg-white border border-slate-300 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={isBn ? 'টাকার পরিমাণ লিখুন' : 'Enter amount'}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                {isBn ? 'টাকা' : 'BDT'}
              </span>
            </div>
          </div>

          {/* Live Real-time Due Calculation Preview */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{isBn ? 'পূর্বের বকেয়া:' : 'Previous Balance:'}</span>
              <span className="font-mono">{formatCurrency(currentDue)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{isBn ? 'আদায় করা হচ্ছে:' : 'Amount Collecting:'}</span>
              <span className="font-mono font-semibold text-blue-600">- {formatCurrency(numAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-200 text-sm">
              <span>{isBn ? 'অবশিষ্ট বকেয়া:' : 'Remaining Due:'}</span>
              <span className={`font-mono ${remainingDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(remainingDue)}
              </span>
            </div>
            {isOverpaying && (
              <div className="flex justify-between items-center text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1.5 rounded-lg border border-rose-200">
                <span>{isBn ? '⚠️ অতিরিক্ত লেখা হয়েছে:' : '⚠️ Excess Amount:'}</span>
                <span className="font-mono text-sm">+{formatCurrency(Number((numAmount - currentDue).toFixed(2)))}</span>
              </div>
            )}
          </div>

          {/* Overpayment Warning Card - Blocked collection notification */}
          {isOverpaying && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs space-y-1.5 text-rose-900 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-rose-950 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{isBn ? 'আপনি টাকা বেশি লিখেছেন!' : 'You entered excess amount!'}</span>
              </div>
              <p className="text-[12px] text-rose-800 leading-snug">
                {isBn ? (
                  <>
                    গ্রাহকের বর্তমান বকেয়া <strong className="font-mono font-bold text-rose-950">{currentDue} ৳</strong>। আপনি লিখেছেন <strong className="font-mono font-bold text-rose-950">{numAmount} ৳</strong> (অতিরিক্ত {Number((numAmount - currentDue).toFixed(2))} ৳)। বকেয়ার চেয়ে বেশি টাকা দিয়ে বিল আদায় করা যাবে না।
                  </>
                ) : (
                  <>
                    Customer current due is <strong className="font-mono font-bold text-rose-950">{currentDue} BDT</strong>. You entered <strong className="font-mono font-bold text-rose-950">{numAmount} BDT</strong> (excess {Number((numAmount - currentDue).toFixed(2))} BDT). You cannot collect more than the due amount.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setAmount(currentDue)}
                className="mt-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
              >
                {isBn ? `সঠিক বকেয়া টাকা (${currentDue} ৳) বসান` : `Set Exact Due (${currentDue} BDT)`}
              </button>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {isBn ? 'পরিশোধের মাধ্যম' : 'Payment Method'} *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Cash', 'bKash', 'Nagad', 'Bank'].map((m) => {
                const label = isBn ? (m === 'Cash' ? 'নগদ ক্যাশ' : m === 'Bank' ? 'ব্যাংক' : m) : m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      method === m
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="pay-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              {isBn ? 'নোট / বিবরণ (ঐচ্ছিক)' : 'Notes (Optional)'}
            </label>
            <input
              id="pay-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isBn ? 'যেমন: চলতি মাসের ক্যাবল বিল' : 'e.g. Monthly bill for September'}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || numAmount <= 0 || isOverpaying || cooldownSeconds > 0 || (isCollector && isClosed)}
            className={`w-full py-3.5 px-4 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-2 ${
              (isCollector && isClosed) || isOverpaying
                ? 'bg-rose-600 opacity-90 cursor-not-allowed shadow-md shadow-rose-600/20'
                : cooldownSeconds > 0
                ? 'bg-amber-600 opacity-90 cursor-not-allowed shadow-md shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isBn ? 'পেমেন্ট সম্পন্ন হচ্ছে...' : 'Processing Payment...'}</span>
              </>
            ) : isCollector && isClosed ? (
              <>
                <AlertCircle className="w-5 h-5 text-white" />
                <span>{isBn ? 'সংযোগ বন্ধ (বিল নেওয়া যাবে না)' : 'Line Closed (Cannot collect bill)'}</span>
              </>
            ) : isOverpaying ? (
              <>
                <AlertCircle className="w-5 h-5 text-white animate-pulse" />
                <span>{isBn ? `টাকা বেশি লিখেছেন (${numAmount} > ${currentDue} ৳)` : `Excess Amount (${numAmount} > ${currentDue})`}</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Clock className="w-5 h-5 animate-pulse" />
                <span>{isBn ? `অপেক্ষা করুন (${formatCooldownTime(cooldownSeconds)})` : `Wait (${formatCooldownTime(cooldownSeconds)})`}</span>
              </>
            ) : (
              <>
                <span>{isBn ? `আদায় নিশ্চিত করুন (${formatCurrency(numAmount)})` : `Confirm & Collect ${formatCurrency(numAmount)}`}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

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
