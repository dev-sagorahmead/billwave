import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { 
  User, Phone, MapPin, Calendar, Package, AlertCircle, 
  Wallet, Receipt, ArrowLeft, Edit, Power, PowerOff, 
  RotateCcw, RefreshCw, FileText, CheckCircle, Clock 
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);

  // Modals
  const [collectModal, setCollectModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [customBill, setCustomBill] = useState(150);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomer(id);
      setData(res);
      setSelectedPkgId(res.customer.package_id || '');
      setCustomBill(res.customer.monthly_bill || 150);
    } catch (err) {
      alert('Error fetching customer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const pkgs = await api.getPackages();
      setPackages(pkgs);
    } catch (e) {}
  };

  useEffect(() => {
    fetchProfile();
    loadPackages();
  }, [id]);

  const handleToggleConnection = async () => {
    if (!data) return;
    const isClosed = data.customer.status === 'Closed';
    const nextStatus = isClosed ? 'Active' : 'Closed';
    const confirmMsg = isClosed
      ? `Reopen connection for ${data.customer.name}? Monthly billing will resume.`
      : `Close / Suspend connection for ${data.customer.name}? Existing balance of ${data.customer.current_due} BDT will remain due, and no new monthly bills will be added while closed.`;

    if (!confirm(confirmMsg)) return;

    try {
      setActionLoading(true);
      await api.changeCustomerStatus(data.customer.id, nextStatus, isClosed ? 'Reopened by Admin' : 'Closed by Admin');
      fetchProfile();
    } catch (err) {
      alert('Status change failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePackageSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.changeCustomerPackage(data.customer.id, selectedPkgId, customBill);
      setShowPackageModal(false);
      fetchProfile();
    } catch (err) {
      alert('Package change failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewReceipt = async (receiptNum) => {
    try {
      const r = await api.getReceipt(receiptNum);
      setActiveReceipt(r);
    } catch (err) {
      alert('Error loading receipt: ' + err.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <span>Loading customer profile...</span>
        </div>
      </div>
    );
  }

  const { customer, billingSummary, payments, bills } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-6xl mx-auto">
      
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Call Customer</span>
          </a>

          <button
            type="button"
            onClick={() => setCollectModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPackageModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-300"
          >
            <Package className="w-4 h-4 text-slate-500" />
            <span>Change Package</span>
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={handleToggleConnection}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              customer.status === 'Closed'
                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
            }`}
          >
            {customer.status === 'Closed' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            <span>{customer.status === 'Closed' ? 'Reopen Connection' : 'Close Connection'}</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-blue-500/20 shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                  {customer.customer_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  customer.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                  customer.status === 'Free' ? 'bg-blue-100 text-blue-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {customer.status} Line
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Phone: {customer.phone}</span>
                {customer.alternative_phone && <span>• Alt: {customer.alternative_phone}</span>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Address: {customer.address} {customer.road_house_info ? `(${customer.road_house_info})` : ''} • Area: {customer.area_name}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right min-w-[180px]">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Current Outstanding Balance
            </span>
            <span className={`text-2xl font-black font-mono ${customer.current_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {customer.current_due} BDT
            </span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Monthly Package: {customer.monthly_bill} BDT
            </div>
          </div>

        </div>

        {/* 5 Billing Summary Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Previous Due</span>
            <span className="text-base font-bold font-mono text-slate-800">{billingSummary.previous_due} BDT</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Current Due</span>
            <span className="text-base font-bold font-mono text-rose-600">{billingSummary.current_due} BDT</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Package Price</span>
            <span className="text-base font-bold font-mono text-slate-800">{billingSummary.monthly_bill} BDT/mo</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Total Lifetime Paid</span>
            <span className="text-base font-bold font-mono text-emerald-600">{billingSummary.total_paid} BDT</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block">Last Payment Date</span>
            <span className="text-xs font-bold text-slate-800">{billingSummary.last_payment_date || 'No payment yet'}</span>
          </div>
        </div>

      </div>

      {/* Two Column Layout: Payment History & Billing Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Payment History ({payments.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Collector</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400">No payments recorded yet.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{p.payment_date}</td>
                      <td className="p-3 font-mono text-[11px] text-blue-600 font-semibold">{p.receipt_number}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">{p.paid_amount} BDT</td>
                      <td className="p-3 font-medium text-slate-700">{p.payment_method}</td>
                      <td className="p-3 text-slate-500">{p.collector_name || 'Office'}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(p.receipt_number)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded font-semibold text-[11px]"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Billing Records */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Monthly Bill Records ({bills.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Billed</th>
                  <th className="p-3">Prev Due</th>
                  <th className="p-3">Total Due</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400">No monthly bills generated yet.</td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-slate-800">{b.billing_month}</td>
                      <td className="p-3">{b.package_name}</td>
                      <td className="p-3 font-mono font-bold text-blue-600">{b.amount} BDT</td>
                      <td className="p-3 font-mono text-slate-500">{b.previous_due} BDT</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{b.total_due} BDT</td>
                      <td className="p-3">
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

      {/* Modal: Change Package */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Change Customer Package
            </h3>
            <form onSubmit={handleChangePackageSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Package</label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => {
                    const idVal = e.target.value;
                    setSelectedPkgId(idVal);
                    const p = packages.find(pkg => pkg.id === parseInt(idVal, 10));
                    if (p) setCustomBill(p.price);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price} BDT)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Bill Rate (BDT)</label>
                <input
                  type="number"
                  required
                  value={customBill}
                  onChange={(e) => setCustomBill(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Bill Payment Modal */}
      {collectModal && (
        <PaymentModal
          customer={customer}
          onSuccess={(receipt) => {
            setCollectModal(false);
            setActiveReceipt(receipt);
            fetchProfile();
          }}
          onClose={() => setCollectModal(false)}
        />
      )}

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
