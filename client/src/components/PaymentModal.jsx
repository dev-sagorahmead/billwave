import React, { useState } from 'react';
import { api } from '../utils/api';
import confetti from 'canvas-confetti';
import { X, Wallet, Check, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function PaymentModal({ customer, onSuccess, onClose }) {
  if (!customer) return null;

  const currentDue = Number(customer.current_due) || 0;
  const monthlyBill = Number(customer.monthly_bill) || 150;

  const [amount, setAmount] = useState(currentDue > 0 ? currentDue : monthlyBill);
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [allowAdvance, setAllowAdvance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numAmount = Number(amount) || 0;
  const remainingDue = Math.max(0, currentDue - numAmount);
  const isOverpaying = numAmount > currentDue && currentDue > 0;

  const handleQuickAmount = (val) => {
    setAmount(val);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero');
      return;
    }

    if (isOverpaying && !allowAdvance) {
      setError(`Amount (${numAmount} BDT) exceeds outstanding balance (${currentDue} BDT). Enable advance payment to proceed.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.collectPayment({
        customer_id: customer.id,
        paid_amount: numAmount,
        payment_method: method,
        notes,
        allow_advance: allowAdvance
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (err) {}

      onSuccess(res.receipt);
    } catch (err) {
      setError(err.message || 'Payment collection failed');
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
              <h2 className="font-bold text-base leading-tight">Collect Bill Payment</h2>
              <p className="text-xs text-blue-100 mt-0.5">Quick touch mobile collection</p>
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
              <p className="text-xs text-slate-500 mt-0.5">{customer.phone} • {customer.area_name || customer.area || 'Main Area'}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Outstanding Due</span>
              <span className={`text-lg font-bold font-mono ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {currentDue} BDT
              </span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Amount Suggestion Badges */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Quick Payment Shortcuts
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
                  Full Due ({currentDue} BDT)
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
                  1 Month ({monthlyBill} BDT)
                </button>
              )}

              {currentDue > 200 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(Math.round(currentDue / 2))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Half ({Math.round(currentDue / 2)} BDT)
                </button>
              )}
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label htmlFor="pay-amount" className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (BDT) *
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
                placeholder="Enter amount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                BDT
              </span>
            </div>
          </div>

          {/* Live Real-time Due Calculation Preview */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Previous Balance:</span>
              <span className="font-mono">{currentDue} BDT</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Amount Collecting:</span>
              <span className="font-mono font-semibold text-blue-600">- {numAmount} BDT</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-200 text-sm">
              <span>Remaining Balance:</span>
              <span className={`font-mono ${remainingDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {remainingDue} BDT
              </span>
            </div>
          </div>

          {/* Overpayment Warning & Toggle */}
          {isOverpaying && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Advance / Overpayment Detected</span>
              </div>
              <p className="text-amber-700 text-[11px]">
                Customer is paying {numAmount - currentDue} BDT more than their current balance.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowAdvance}
                  onChange={(e) => setAllowAdvance(e.target.checked)}
                  className="rounded border-amber-400 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-amber-900 font-medium">Allow advance payment collection</span>
              </label>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Cash', 'bKash', 'Nagad', 'Bank'].map((m) => (
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
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="pay-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              id="pay-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly bill for September"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || numAmount <= 0 || (isOverpaying && !allowAdvance)}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <span>Confirm & Collect {numAmount} BDT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
