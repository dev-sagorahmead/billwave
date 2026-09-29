import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  Receipt, Calendar, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldCheck, Loader2, RefreshCw, FileText, Ban 
} from 'lucide-react';

export default function BillingGeneration() {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [preview, setPreview] = useState(null);
  const [billsHistory, setBillsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [prevData, histData] = await Promise.all([
        api.getBillingPreview(selectedMonth),
        api.getBillingHistory(`month=${selectedMonth}`)
      ]);
      setPreview(prevData);
      setBillsHistory(histData.bills);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [selectedMonth]);

  const handleGenerateBills = async () => {
    if (!preview) return;
    if (preview.pendingCount === 0) {
      alert(`All eligible active customers have already been billed for month ${selectedMonth}. Duplicate generation prevented.`);
      return;
    }

    if (!confirm(`Generate monthly bills for ${preview.pendingCount} active customer(s) for billing cycle ${selectedMonth}? Total amount: ${preview.totalPendingAmount} BDT.`)) {
      return;
    }

    try {
      setGenerating(true);
      const res = await api.generateBills(selectedMonth);
      setResultMessage(res.message);
      setTimeout(() => setResultMessage(''), 6000);
      fetchBillingData();
    } catch (err) {
      alert('Billing generation failed: ' + err.message);
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
            <span>Automated Monthly Billing Generator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generate monthly package bills with strict duplicate prevention and tenant isolation
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Billing Cycle:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {resultMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{resultMessage}</span>
        </div>
      )}

      {/* Strict System Rules Banner (Requirements 9, 10, 11) */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs space-y-2 text-blue-950">
        <div className="font-bold flex items-center gap-2 text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Automated Billing Rules & Safeguards</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-blue-900 pt-1">
          <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100">
            <strong>1. Active Paid Lines Only:</strong> Automatically adds package price to outstanding balance for active paid subscribers.
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100">
            <strong>2. Duplicate Prevention:</strong> System checks existing billing records for {selectedMonth}. Duplicate generation is strictly blocked!
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100">
            <strong>3. Free & Closed Customers:</strong> Closed and Free lines are <em>excluded</em> from monthly bills. Any existing dues remain frozen and payable.
          </div>
        </div>
      </div>

      {/* Billing Stats & Trigger Card */}
      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Billing Cycle: {selectedMonth} Status Overview
              </h2>
              <p className="text-xs text-slate-500">
                Calculated eligibility and generation progress for this calendar month
              </p>
            </div>

            <button
              type="button"
              disabled={preview.pendingCount === 0 || generating}
              onClick={handleGenerateBills}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Bills...</span>
                </>
              ) : preview.pendingCount === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All Active Customers Billed</span>
                </>
              ) : (
                <>
                  <span>Generate Bills ({preview.pendingCount} Pending)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Total Active Eligible</span>
              <span className="text-xl font-bold text-slate-900">{preview.totalEligible}</span>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block">Already Billed</span>
              <span className="text-xl font-bold text-emerald-700">{preview.alreadyBilledCount}</span>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
              <span className="text-amber-700 block">Pending to Bill</span>
              <span className="text-xl font-bold text-amber-700">{preview.pendingCount}</span>
            </div>

            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
              <span className="text-blue-700 block">Pending Bill Amount</span>
              <span className="text-xl font-bold font-mono text-blue-700">{preview.totalPendingAmount} BDT</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">Excluded Lines</span>
              <span className="text-xs font-medium text-slate-600 mt-1 block">
                {preview.closedCustomerCount} Closed • {preview.freeCustomerCount} Free
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
            <span>Generated Bill Records for {selectedMonth} ({billsHistory.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Customer ID</th>
                <th className="p-3.5">Customer Name & Phone</th>
                <th className="p-3.5">Area</th>
                <th className="p-3.5">Package</th>
                <th className="p-3.5">Bill Amount</th>
                <th className="p-3.5">Previous Due</th>
                <th className="p-3.5 font-bold text-slate-900">Total Due</th>
                <th className="p-3.5">Generated At</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billsHistory.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No bills generated yet for cycle {selectedMonth}. Click "Generate Bills" above.
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
                    <td className="p-3.5 font-mono font-bold text-blue-600">+{b.amount} BDT</td>
                    <td className="p-3.5 font-mono text-slate-500">{b.previous_due} BDT</td>
                    <td className="p-3.5 font-mono font-black text-slate-900">{b.total_due} BDT</td>
                    <td className="p-3.5 text-[11px] text-slate-500">{b.generated_at}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        b.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {b.status}
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
