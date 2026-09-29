import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Search, PlusCircle, Filter, Phone, Eye, 
  Wallet, AlertCircle, CheckCircle2, XCircle, MoreVertical, 
  ArrowUpDown, Trash2, Edit, Check, ChevronRight, X
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';

export default function CustomerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [areaId, setAreaId] = useState(searchParams.get('area_id') || 'all');
  const [packageId, setPackageId] = useState(searchParams.get('package_id') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [dueType, setDueType] = useState(searchParams.get('due_type') || '');
  const [sortBy, setSortBy] = useState('id_desc');

  // Metadata dropdowns
  const [areas, setAreas] = useState([]);
  const [packages, setPackages] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(searchParams.get('action') === 'new');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [collectCust, setCollectCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [statusModalCust, setStatusModalCust] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Add customer form
  const [formData, setFormData] = useState({
    name: '',
    father_husband_name: '',
    phone: '',
    alternative_phone: '',
    address: '',
    road_house_info: '',
    area_id: '',
    package_id: '',
    monthly_bill: 150,
    previous_due: 0,
    connection_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    notes: '',
    custom_customer_id: ''
  });

  const loadMetadata = async () => {
    try {
      const [areasData, pkgsData] = await Promise.all([
        api.getAreas(),
        api.getPackages()
      ]);
      setAreas(areasData);
      setPackages(pkgsData);
      if (areasData.length > 0 && !formData.area_id) {
        setFormData(prev => ({ ...prev, area_id: areasData[0].id }));
      }
      if (pkgsData.length > 0 && !formData.package_id) {
        setFormData(prev => ({ ...prev, package_id: pkgsData[0].id, monthly_bill: pkgsData[0].price }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        area_id: areaId,
        package_id: packageId,
        status,
        due_type: dueType,
        sort_by: sortBy,
        page,
        limit: 50
      }).toString();

      const res = await api.getCustomers(query);
      setCustomers(res.customers);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [areaId, packageId, status, dueType, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handlePackageChangeInForm = (pkgId) => {
    const selectedPkg = packages.find(p => p.id === parseInt(pkgId, 10));
    setFormData(prev => ({
      ...prev,
      package_id: pkgId,
      monthly_bill: selectedPkg ? selectedPkg.price : prev.monthly_bill
    }));
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.createCustomer(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        father_husband_name: '',
        phone: '',
        alternative_phone: '',
        address: '',
        road_house_info: '',
        area_id: areas[0]?.id || '',
        package_id: packages[0]?.id || '',
        monthly_bill: packages[0]?.price || 150,
        previous_due: 0,
        connection_date: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: '',
        custom_customer_id: ''
      });
      fetchCustomers();
    } catch (err) {
      alert('Error creating customer: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.updateCustomer(editingCustomer.id, editingCustomer);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert('Error updating customer: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      setActionLoading(true);
      await api.changeCustomerStatus(statusModalCust.id, newStatus, statusReason);
      setStatusModalCust(null);
      setStatusReason('');
      fetchCustomers();
    } catch (err) {
      alert('Error changing status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (cust) => {
    if (!confirm(`Are you sure you want to delete customer ${cust.name} (${cust.customer_id})?`)) return;
    try {
      await api.deleteCustomer(cust.id);
      fetchCustomers();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Customer Directory & Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {total} subscribers found across your network
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Global Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        
        {/* Global Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Customer ID (DSN-000001), Name, Phone, Area, Address..."
            className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>

        {/* Filter Pills / Dropdowns */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          
          {/* Area Filter */}
          <select
            value={areaId}
            onChange={(e) => { setAreaId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="all">All Areas</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Package Filter */}
          <select
            value={packageId}
            onChange={(e) => { setPackageId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="all">All Packages</option>
            {packages.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.price} BDT)</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Free">Free Lines</option>
            <option value="Closed">Closed / Suspended</option>
          </select>

          {/* Due filter */}
          <select
            value={dueType}
            onChange={(e) => { setDueType(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="">All Due Categories</option>
            <option value="has_due">Has Outstanding Due</option>
            <option value="zero_due">Fully Paid (0 Due)</option>
            <option value="1_month">1 Month Due</option>
            <option value="2_months">2 Months Due</option>
            <option value="3_plus_months">3+ Months Due</option>
            <option value="partial_due">Partial Due</option>
            <option value="high_due">High Due (&gt; 500 BDT)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 ml-auto"
          >
            <option value="id_desc">Newest First</option>
            <option value="highest_due">Highest Due First</option>
            <option value="lowest_due">Lowest Due First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="id_asc">Customer ID (Ascending)</option>
            <option value="area_asc">Area Wise</option>
            <option value="latest_payment">Recent Payment Date</option>
          </select>

        </div>

      </div>

      {/* Customer Mobile Cards & Responsive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Mobile View: High-density touch cards */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {customers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No customers found matching filter.
            </div>
          ) : (
            customers.map((cust) => (
              <div key={cust.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">{cust.name}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {cust.customer_id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {cust.phone} • {cust.area_name || 'No Area'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                      {cust.address}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Due</span>
                    <span className={`text-base font-black font-mono ${cust.current_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {cust.current_due} BDT
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cust.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      cust.status === 'Free' ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {cust.status}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {cust.package_name} ({cust.monthly_bill} BDT)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${cust.phone}`}
                      className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                      title="Call Customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setCollectCust(cust)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                    >
                      Collect
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/customers/${cust.id}`)}
                      className="p-1.5 text-slate-500 hover:text-slate-900"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tablet / Desktop View: Full Data Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Customer ID</th>
                <th className="p-3.5">Customer Name & Contact</th>
                <th className="p-3.5">Area & Address</th>
                <th className="p-3.5">Package</th>
                <th className="p-3.5">Monthly Bill</th>
                <th className="p-3.5">Current Due</th>
                <th className="p-3.5">Last Payment</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {cust.customer_id}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>{cust.phone}</span>
                        {cust.alternative_phone && <span>/ {cust.alternative_phone}</span>}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{cust.area_name || '-'}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{cust.address}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {cust.package_name || 'Standard'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {cust.monthly_bill} BDT
                    </td>
                    <td className="p-3.5 font-mono font-black">
                      <span className={cust.current_due > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {cust.current_due} BDT
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-500">
                      {cust.last_payment_date || 'Never'}
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => setStatusModalCust(cust)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          cust.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : cust.status === 'Free'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Click to change connection status"
                      >
                        <span>{cust.status}</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <a
                        href={`tel:${cust.phone}`}
                        className="p-1.5 inline-block text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Call Customer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setCollectCust(cust)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                      >
                        Collect
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/customers/${cust.id}`)}
                        className="p-1.5 inline-block text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(cust)}
                        className="p-1.5 inline-block text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cust)}
                        className="p-1.5 inline-block text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>Page {page} of {totalPages} ({total} customers)</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal: Add New Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 my-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Add New Customer</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Abdur Rahim"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Father / Husband Name</label>
                  <input
                    type="text"
                    value={formData.father_husband_name}
                    onChange={(e) => setFormData({ ...formData, father_husband_name: e.target.value })}
                    placeholder="e.g. Abdul Karim"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 01711223344"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alternative Phone</label>
                  <input
                    type="text"
                    value={formData.alternative_phone}
                    onChange={(e) => setFormData({ ...formData, alternative_phone: e.target.value })}
                    placeholder="e.g. 01811223344"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Area *</label>
                  <select
                    required
                    value={formData.area_id}
                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Area</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Package *</label>
                  <select
                    required
                    value={formData.package_id}
                    onChange={(e) => handlePackageChangeInForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Package</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.price} BDT/mo</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Bill (BDT)</label>
                  <input
                    type="number"
                    value={formData.monthly_bill}
                    onChange={(e) => setFormData({ ...formData, monthly_bill: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Previous / Initial Due (BDT)</label>
                  <input
                    type="number"
                    value={formData.previous_due}
                    onChange={(e) => setFormData({ ...formData, previous_due: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Complete Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. House 14, Road 3, Block B, Mirpur-1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Road / House / Flat Info</label>
                  <input
                    type="text"
                    value={formData.road_house_info}
                    onChange={(e) => setFormData({ ...formData, road_house_info: e.target.value })}
                    placeholder="e.g. Flat 4B, 3rd Floor"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Connection Date</label>
                  <input
                    type="date"
                    value={formData.connection_date}
                    onChange={(e) => setFormData({ ...formData, connection_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Free">Free</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custom Customer ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.custom_customer_id}
                    onChange={(e) => setFormData({ ...formData, custom_customer_id: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Customer */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Edit Customer ({editingCustomer.customer_id})
              </h3>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.address}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area</label>
                  <select
                    value={editingCustomer.area_id || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, area_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Bill (BDT)</label>
                  <input
                    type="number"
                    value={editingCustomer.monthly_bill}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, monthly_bill: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Status (Active, Free, Closed) */}
      {statusModalCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Change Status: {statusModalCust.name}
            </h3>
            <p className="text-xs text-slate-500">
              Current Due: <strong className="text-rose-600">{statusModalCust.current_due} BDT</strong> will remain preserved.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Reason / Notes</label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Non-payment, user requested, complimentary"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleChangeStatus('Active')}
                className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleChangeStatus('Free')}
                className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => handleChangeStatus('Closed')}
                className="py-2.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Closed
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStatusModalCust(null)}
              className="w-full py-1 text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collect Bill Payment Modal */}
      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchCustomers();
          }}
          onClose={() => setCollectCust(null)}
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
