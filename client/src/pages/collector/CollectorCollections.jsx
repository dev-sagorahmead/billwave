import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Receipt, Calendar, Wallet, RefreshCw, Eye } from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';

export default function CollectorCollections() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments(`date_filter=${dateFilter}`);
      setPayments(res.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [dateFilter]);

  const totalCollected = payments.reduce((acc, p) => acc + p.paid_amount, 0);

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const r = await api.getReceipt(receiptNum);
      setActiveReceipt(r);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-24 md:pb-8 max-w-4xl mx-auto">
      
      {/* Header & Total Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>My Collected Payments & Receipts</span>
          </h1>
          <p className="text-xs text-slate-500">
            {payments.length} transactions recorded for this period
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase">Total Collected</span>
          <span className="font-mono font-black text-emerald-600 text-lg">
            {totalCollected} BDT
          </span>
        </div>
      </div>

      {/* Date Filter Chips */}
      <div className="flex gap-2 text-xs overflow-x-auto pb-1">
        {[
          { id: 'today', label: "Today's Collections" },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'this_week', label: 'This Week' },
          { id: 'this_month', label: 'This Month' },
          { id: 'all', label: 'All History' }
        ].map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setDateFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
              dateFilter === f.id
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Payment Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading payments...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No payments collected during this period.
          </div>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 hover:border-emerald-300 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm text-slate-900">{p.customer_name}</div>
                  <div className="text-xs text-slate-500 font-mono">{p.customer_code} • {p.area_name || '-'}</div>
                  <div className="text-[11px] text-blue-600 font-mono mt-0.5">{p.receipt_number}</div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black font-mono text-emerald-600 block">
                    +{p.paid_amount} BDT
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Remaining: {p.remaining_due} BDT
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                <span>{p.payment_date} {p.payment_time} • {p.payment_method}</span>
                <button
                  type="button"
                  onClick={() => handleOpenReceipt(p.receipt_number)}
                  className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  View Receipt
                </button>
              </div>
            </div>
          ))
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
