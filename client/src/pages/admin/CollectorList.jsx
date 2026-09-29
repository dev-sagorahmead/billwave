import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  UserCheck, PlusCircle, Phone, Mail, Key, 
  Trash2, Edit, CheckCircle2, XCircle, Wallet, 
  Users, MapPin, X, Loader2, ArrowRight, Eye, Calendar 
} from 'lucide-react';

export default function CollectorList() {
  const [collectors, setCollectors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCollector, setEditingCollector] = useState(null);
  const [resetPassModal, setResetPassModal] = useState(null);
  const [collectorReportModal, setCollectorReportModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    area_ids: [],
    status: 'Active',
    joining_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [colsData, areasData] = await Promise.all([
        api.getCollectors(),
        api.getAreas()
      ]);
      setCollectors(colsData);
      setAreas(areasData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCollector = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.createCollector(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        area_ids: [],
        status: 'Active',
        joining_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err) {
      alert('Error creating collector: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      setActionLoading(true);
      await api.resetCollectorPassword(resetPassModal.id, newPassword);
      setResetPassModal(null);
      setNewPassword('');
      alert('Password reset successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (col) => {
    const nextStatus = col.status === 'Active' ? 'Inactive' : 'Active';
    if (!confirm(`Set status of ${col.name} to ${nextStatus}?`)) return;
    try {
      await api.changeCollectorStatus(col.id, nextStatus);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (col) => {
    if (!confirm(`Are you sure you want to remove ${col.name}? Historical collections will be preserved.`)) return;
    try {
      await api.deleteCollector(col.id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenReport = async (col) => {
    try {
      const [fullCol, history] = await Promise.all([
        api.getCollector(col.id),
        api.getCollectorHistory(col.id)
      ]);
      setCollectorReportModal({ ...fullCol, history });
    } catch (err) {
      alert('Failed to load collector report: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>Bill Collector Management & Performance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage field billing staff, assign territory permissions, and monitor recoveries
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Collector</span>
        </button>
      </div>

      {/* Collector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collectors.map((col) => (
          <div key={col.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-emerald-300 transition-all">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                  {col.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">{col.name}</h2>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{col.phone}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{col.email}</div>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                col.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {col.status}
              </span>
            </div>

            {/* Assigned Areas Badges */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Assigned Areas (Strict Isolation):</span>
              <div className="flex flex-wrap gap-1">
                {col.areas?.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">No area assigned yet</span>
                ) : (
                  col.areas.map((a) => (
                    <span key={a.id} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                      {a.name} ({a.code})
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Performance Statistics Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Today Collected</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{col.todayCollection} BDT</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">This Month</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{col.monthCollection} BDT</span>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block">Assigned Customers</span>
                <span className="font-bold text-slate-800">{col.assignedCustomers}</span>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block">Assigned Due</span>
                <span className="font-mono font-bold text-rose-600">{col.totalDue} BDT</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => handleOpenReport(col)}
                className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Report</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setResetPassModal(col)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                  title="Reset Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(col)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                  title="Toggle Active/Inactive"
                >
                  {col.status === 'Active' ? <XCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(col)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Delete Collector"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal: Add Collector */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Add New Bill Collector</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollector} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kamal Hossain"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email / Username *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kamal@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01711223344"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Area assignment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Area(s) (Collector will only see customers in these areas)
                </label>
                <div className="border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {areas.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.area_ids.includes(a.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, area_ids: [...prev.area_ids, a.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, area_ids: prev.area_ids.filter(id => id !== a.id) }));
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{a.name} ({a.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Create Collector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Reset Password for {resetPassModal.name}
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPassModal(null)}
                  className="px-3 py-1.5 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Collector Full Performance Report (Requirement 18) */}
      {collectorReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto my-6">
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Collector Performance: {collectorReportModal.collector.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {collectorReportModal.collector.phone} • {collectorReportModal.collector.email}
                </p>
              </div>
              <button onClick={() => setCollectorReportModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Today's Collection</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {collectorReportModal.stats.todayCollection} BDT
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">This Month</span>
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {collectorReportModal.stats.monthCollection} BDT
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Lifetime Total</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {collectorReportModal.stats.totalCollection} BDT
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Transactions</span>
                <span className="font-bold text-slate-900 text-sm">
                  {collectorReportModal.stats.totalTxCount}
                </span>
              </div>
            </div>

            {/* Assigned Areas and Customer info */}
            <div className="text-xs space-y-1">
              <span className="font-semibold text-slate-700 block">Assigned Territory:</span>
              <div className="flex gap-2">
                {collectorReportModal.areas.map(a => (
                  <span key={a.id} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                    {a.name} ({a.code})
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Assigned Customers: {collectorReportModal.stats.assignedCustomers} • Outstanding Balance: {collectorReportModal.stats.totalDue} BDT
              </p>
            </div>

            {/* Collection History Table */}
            <div>
              <h4 className="font-semibold text-xs text-slate-700 mb-2">Collection History Log:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Receipt</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collectorReportModal.history.map(h => (
                      <tr key={h.id}>
                        <td className="p-2">{h.payment_date}</td>
                        <td className="p-2 font-mono text-[11px] text-blue-600">{h.receipt_number}</td>
                        <td className="p-2 font-bold">{h.customer_name}</td>
                        <td className="p-2 font-mono font-bold text-emerald-600">+{h.paid_amount} BDT</td>
                        <td className="p-2">{h.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCollectorReportModal(null)}
              className="w-full py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Close Report
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
