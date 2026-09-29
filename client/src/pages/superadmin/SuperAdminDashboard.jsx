import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  Building2, Users, Wallet, AlertCircle, TrendingUp, 
  Plus, Search, Key, Trash2, CheckCircle2, XCircle, 
  Eye, RefreshCw, Loader2, ShieldCheck, MapPin, Phone, Mail
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetPassModal, setResetPassModal] = useState(null);
  const [viewCompanyModal, setViewCompanyModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // New Company Form state
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    phone: '',
    email: '',
    address: '',
    admin_email: '',
    admin_password: '',
    customer_prefix: 'FCN',
    logo: '',
    status: 'Active',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, companiesData] = await Promise.all([
        api.getSuperAdminStats(),
        api.getCompanies(`search=${search}&status=${statusFilter}`)
      ]);
      setStats(statsData);
      setCompanies(companiesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.createCompany(formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        owner_name: '',
        phone: '',
        email: '',
        address: '',
        admin_email: '',
        admin_password: '',
        customer_prefix: 'FCN',
        logo: '',
        status: 'Active',
        notes: ''
      });
      setMessage('New company and admin account successfully created!');
      setTimeout(() => setMessage(''), 4000);
      fetchData();
    } catch (err) {
      alert('Error creating company: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async (company) => {
    const nextStatus = company.status === 'Active' ? 'Inactive' : 'Active';
    if (!confirm(`Are you sure you want to mark ${company.name} as ${nextStatus}?`)) return;

    try {
      await api.changeCompanyStatus(company.id, nextStatus);
      fetchData();
    } catch (err) {
      alert('Error updating status: ' + err.message);
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
      await api.resetCompanyPassword(resetPassModal.id, newPassword);
      setResetPassModal(null);
      setNewPassword('');
      alert('Admin password has been reset successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!confirm(`WARNING: Deleting "${company.name}" will permanently remove all customers, collectors, bills, and payment records for this company! Do you want to proceed?`)) return;

    try {
      await api.deleteCompany(company.id);
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleViewCompany = async (id) => {
    try {
      const details = await api.getCompany(id);
      setViewCompanyModal(details);
    } catch (err) {
      alert('Failed to load company details: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <span>Super Admin Platform Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global management over all independent Dish/Cable companies & platform revenue
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Company</span>
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* 8 Metric Cards specified in Requirement 1 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Companies</span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalCompanies}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              {stats.activeCompanies} Active
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Customers</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalCustomers}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats.activeCustomers} Active • {stats.suspendedCustomers} Closed
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Outstanding</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">{stats.totalOutstanding} BDT</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all companies</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Today's Collection</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{stats.todayCollection} BDT</div>
            <div className="text-[11px] text-slate-500 mt-1">This month: {stats.thisMonthCollection} BDT</div>
          </div>

        </div>
      )}

      {/* Companies Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-base text-slate-900">Registered Dish / Cable Companies</h2>
            <p className="text-xs text-slate-500">Each company operates within strict multi-tenant data boundaries</p>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, owner, phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Company Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Company Name</th>
                <th className="p-3.5">Owner & Contact</th>
                <th className="p-3.5">Prefix</th>
                <th className="p-3.5">Customers</th>
                <th className="p-3.5">Collectors</th>
                <th className="p-3.5">Total Due</th>
                <th className="p-3.5">Total Collected</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.address || 'Dhaka, Bangladesh'}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-slate-800">{c.owner_name}</div>
                    <div className="text-[11px] text-slate-500">{c.phone} • {c.email}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                      {c.customer_prefix || 'FCN'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{c.customer_count}</div>
                    <div className="text-[10px] text-emerald-600">{c.active_customer_count} Active</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">
                    {c.collector_count}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-rose-600">
                    {c.total_due} BDT
                  </td>
                  <td className="p-3.5 font-mono font-bold text-emerald-600">
                    {c.total_collected} BDT
                  </td>
                  <td className="p-3.5">
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(c)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        c.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {c.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{c.status}</span>
                    </button>
                  </td>
                  <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleViewCompany(c.id)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetPassModal(c)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Reset Admin Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCompany(c)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete Company"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Company */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 my-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>Register New Dish / Cable Company</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dhaka Sky Cable Network"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="e.g. Rafiqul Islam"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 01811223344"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer ID Prefix</label>
                  <input
                    type="text"
                    value={formData.customer_prefix}
                    onChange={(e) => setFormData({ ...formData, customer_prefix: e.target.value })}
                    placeholder="e.g. DSN (Generates DSN-000001)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. House 42, Road 11, Sector 4, Uttara, Dhaka"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Initial Company Admin Credentials */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <span className="text-xs font-bold text-purple-900 block">Initial Company Admin Account</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-950 mb-1">Admin Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      placeholder="admin@company.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-950 mb-1">Admin Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.admin_password}
                      onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-xs bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Create Company & Admin</span>
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
              Reset Admin Password for {resetPassModal.name}
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPassModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Company Details */}
      {viewCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">{viewCompanyModal.company.name}</h3>
                <p className="text-xs text-slate-500">{viewCompanyModal.company.address}</p>
              </div>
              <button onClick={() => setViewCompanyModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Owner</span>
                <span className="font-bold text-slate-800">{viewCompanyModal.company.owner_name}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Phone</span>
                <span className="font-bold text-slate-800">{viewCompanyModal.company.phone}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Admin Email</span>
                <span className="font-bold text-slate-800">{viewCompanyModal.admin?.email}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Total Customers</span>
                <span className="font-bold text-slate-800">{viewCompanyModal.stats.customer_count} ({viewCompanyModal.stats.active_customers} Active)</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-slate-700 mb-1">Company Areas:</h4>
              <div className="flex flex-wrap gap-1.5">
                {viewCompanyModal.areas.map(a => (
                  <span key={a.id} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {a.name} ({a.code})
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewCompanyModal(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
