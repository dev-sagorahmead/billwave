import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { 
  Users, AlertCircle, Wallet, TrendingUp, UserCheck, 
  MapPin, Receipt, PlusCircle, ArrowUpRight, ArrowRight,
  Clock, CheckCircle, FileText, Upload, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend 
} from 'recharts';
import ReceiptModal from '../../components/ReceiptModal';
import PaymentModal from '../../components/PaymentModal';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [collectCust, setCollectCust] = useState(null);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanyDashboard();
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenReceipt = async (receiptNum) => {
    try {
      const receipt = await api.getReceipt(receiptNum);
      setActiveReceipt(receipt);
    } catch (err) {
      alert('Could not load receipt: ' + err.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <span>Loading dashboard analytics...</span>
        </div>
      </div>
    );
  }

  const { metrics, collectorPerformance, recentPayments, monthlyTrend } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Company Billing & Collection Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time subscriber metrics, dues, automated billing & collector monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/customers?action=new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Customer</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/billing')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>Auto Billing</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/import')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Bulk Import</span>
          </button>
        </div>
      </div>

      {/* Top 4 Primary Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Customers */}
        <div 
          onClick={() => navigate('/admin/customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Customers</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalCustomers}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">{metrics.activeCustomers} Active</span>
            <span>•</span>
            <span className="text-slate-400">{metrics.freeCustomers} Free</span>
            <span>•</span>
            <span className="text-rose-500">{metrics.closedCustomers} Closed</span>
          </div>
        </div>

        {/* Total Due */}
        <div 
          onClick={() => navigate('/admin/dues')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-400 transition-all"
        >
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Outstanding Due</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">{metrics.totalDue} BDT</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>View Due Breakdown</span>
            <ArrowRight className="w-3 h-3 text-rose-500" />
          </div>
        </div>

        {/* Today's Collection */}
        <div 
          onClick={() => navigate('/admin/collections?date_filter=today')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Today's Collection</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{metrics.todayCollection} BDT</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.todayTxCount} payment transaction(s) today
          </div>
        </div>

        {/* This Month's Collection */}
        <div 
          onClick={() => navigate('/admin/collections?date_filter=this_month')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">This Month's Collection</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">{metrics.thisMonthCollection} BDT</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Billed this month: {metrics.monthlyBilling?.total_billed || 0} BDT
          </div>
        </div>

      </div>

      {/* Secondary Metrics Bar: Areas & Collectors Count */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => navigate('/admin/collectors')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        >
          <div>
            <div className="text-xs text-slate-500 font-medium">Field Collectors</div>
            <div className="text-lg font-bold text-slate-900">{metrics.collectorsCount}</div>
          </div>
          <UserCheck className="w-5 h-5 text-indigo-500" />
        </div>

        <div 
          onClick={() => navigate('/admin/areas')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        >
          <div>
            <div className="text-xs text-slate-500 font-medium">Operational Areas</div>
            <div className="text-lg font-bold text-slate-900">{metrics.areasCount}</div>
          </div>
          <MapPin className="w-5 h-5 text-purple-500" />
        </div>

        <div 
          onClick={() => navigate('/admin/billing')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        >
          <div>
            <div className="text-xs text-slate-500 font-medium">Generated Bills</div>
            <div className="text-lg font-bold text-slate-900">{metrics.monthlyBilling?.bills_count || 0}</div>
          </div>
          <Receipt className="w-5 h-5 text-amber-500" />
        </div>

        <div 
          onClick={() => navigate('/admin/reports')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        >
          <div>
            <div className="text-xs text-slate-500 font-medium">Reports Center</div>
            <div className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1">
              <span>12 Reports</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
          <FileText className="w-5 h-5 text-blue-500" />
        </div>
      </div>

      {/* Monthly Collection Trend Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Collection & Billing Trend (Last 6 Months)</h2>
            <p className="text-xs text-slate-500">Comparing monthly billed generation vs actual collections</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip 
                formatter={(val) => [`${val} BDT`]}
                contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="collected" name="Collected (BDT)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="billed" name="Billed (BDT)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Split Section: Collector Performance & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Collector Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bill Collector Performance</h2>
              <p className="text-xs text-slate-500">Real-time daily & monthly collections by staff</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/collectors')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {collectorPerformance.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No collectors found. Create one!</div>
            ) : (
              collectorPerformance.map((col) => (
                <div key={col.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm border border-emerald-200">
                      {col.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{col.name}</div>
                      <div className="text-[11px] text-slate-500">{col.phone} • {col.assignedCustomers} customers</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold font-mono text-xs text-emerald-600">
                      Today: {col.todayCollection} BDT
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Month: {col.monthCollection} BDT
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments & Digital Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Collections</h2>
              <p className="text-xs text-slate-500">Live payment transactions</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/collections')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {recentPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No payments collected yet.</div>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">{p.customer_name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                        {p.cust_code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{p.payment_date}</span>
                      <span>•</span>
                      <span>{p.collector_name || 'Office'}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{p.payment_method}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-xs text-emerald-600">
                      +{p.paid_amount} BDT
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenReceipt(p.receipt_number)}
                      className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-md font-medium transition-colors"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchDashboard();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

    </div>
  );
}
