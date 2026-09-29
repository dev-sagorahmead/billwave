import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Users, AlertCircle, TrendingUp, Search, 
  Phone, Receipt, ArrowRight, CheckCircle2, RefreshCw 
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';

export default function CollectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [collectCust, setCollectCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchCollectorData = async () => {
    try {
      setLoading(true);
      if (!user) return;
      const [colData, paymentsData] = await Promise.all([
        api.getCollector(user.id),
        api.getPayments('limit=10')
      ]);
      setStats(colData);
      setRecentPayments(paymentsData.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
          <span>Loading collector portal...</span>
        </div>
      </div>
    );
  }

  const { collector, areas, stats: colStats } = stats;

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-24 md:pb-8 max-w-4xl mx-auto">
      
      {/* Welcome Card & Assigned Areas Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-5 text-white shadow-lg shadow-emerald-900/10 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
              Field Collection Agent
            </span>
            <h1 className="text-xl font-black mt-0.5">{collector.name}</h1>
            <p className="text-xs text-emerald-100">{collector.phone}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/collector/customers')}
            className="px-4 py-2 bg-white text-emerald-800 rounded-xl font-bold text-xs shadow-md shadow-black/10 hover:bg-emerald-50 transition-all flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find Customer</span>
          </button>
        </div>

        {/* Assigned Areas Badges */}
        <div className="pt-2 border-t border-emerald-600/50 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-emerald-200 text-[11px]">Your Assigned Areas:</span>
          {areas.map(a => (
            <span key={a.id} className="bg-emerald-600/80 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-500/40">
              {a.name} ({a.code})
            </span>
          ))}
        </div>
      </div>

      {/* Collector Metrics (Requirement 12) */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Today's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">Today's Collection</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {colStats.todayCollection} BDT
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colStats.todayTxCount} receipts issued today
          </div>
        </div>

        {/* This Month's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">This Month</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {colStats.monthCollection} BDT
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colStats.monthTxCount} transactions
          </div>
        </div>

        {/* Total Assigned Customers */}
        <div 
          onClick={() => navigate('/collector/customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">Assigned Subscribers</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {colStats.assignedCustomers}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <span>Tap to view area customers</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Outstanding in Assigned Areas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Area Due</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {colStats.totalDue} BDT
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pending collection in your zone
          </div>
        </div>

      </div>

      {/* Quick Search Jump Button for Field Collection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-slate-900">Instant Customer Lookup</h2>
          <p className="text-xs text-slate-500">Search customer ID or mobile number in your area</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/collector/customers')}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
        >
          Open Customer List
        </button>
      </div>

      {/* Today's Payments & Receipts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Recent Collections ({recentPayments.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('/collector/collections')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            All Collections
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No payments collected today. Find a customer to collect bills!
            </div>
          ) : (
            recentPayments.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{p.customer_name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">
                      {p.customer_code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {p.payment_time} • {p.payment_method} • Receipt: <span className="font-mono text-blue-600 font-semibold">{p.receipt_number}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-600">
                    +{p.paid_amount} BDT
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await api.getReceipt(p.receipt_number);
                      setActiveReceipt(r);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs rounded font-medium"
                  >
                    Receipt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchCollectorData();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

    </div>
  );
}
