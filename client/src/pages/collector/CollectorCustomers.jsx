import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Search, Phone, Wallet, Eye, 
  MapPin, CheckCircle, AlertCircle, RefreshCw, X 
} from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';

export default function CollectorCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [dueFilter, setDueFilter] = useState('has_due'); // default prioritize customers with due

  // Modals
  const [collectCust, setCollectCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [viewProfileCust, setViewProfileCust] = useState(null);

  const loadAreas = async () => {
    try {
      const a = await api.getAreas();
      setAreas(a);
    } catch (e) {}
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        area_id: selectedAreaId,
        due_type: dueFilter,
        limit: 100
      }).toString();

      const res = await api.getCustomers(query);
      setCustomers(res.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [selectedAreaId, dueFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-24 md:pb-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Assigned Area Customers</span>
          </h1>
          <p className="text-xs text-slate-500">
            Showing customers strictly within your assigned territory
          </p>
        </div>

        <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
          {customers.length} Subscribers
        </span>
      </div>

      {/* Fast Touch Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Customer ID (DSN-000001), phone, or name..."
          className="w-full pl-10 pr-24 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          Find
        </button>
      </form>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        
        {/* Area filter */}
        <select
          value={selectedAreaId}
          onChange={(e) => setSelectedAreaId(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium shrink-0"
        >
          <option value="all">All Assigned Areas</option>
          {areas.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Due filter chips */}
        <button
          type="button"
          onClick={() => setDueFilter(dueFilter === 'has_due' ? '' : 'has_due')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
            dueFilter === 'has_due'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Only With Dues
        </button>

        <button
          type="button"
          onClick={() => setDueFilter(dueFilter === 'zero_due' ? '' : 'zero_due')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
            dueFilter === 'zero_due'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Paid (0 Due)
        </button>

      </div>

      {/* Customer Mobile Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading customers in your area...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No customers found matching your search.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-emerald-300 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900">{c.name}</span>
                    <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {c.customer_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">{c.phone}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{c.address} ({c.area_name})</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Due Balance</span>
                  <span className={`text-base font-black font-mono ${c.current_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {c.current_due} BDT
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Package: {c.monthly_bill} BDT
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                  c.status === 'Free' ? 'bg-blue-100 text-blue-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {c.status} Line
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100"
                    title="Call Customer"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setCollectCust(c)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Collect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewProfileCust(c)}
                    className="p-2 text-slate-500 hover:text-slate-800"
                    title="View Summary"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Customer Profile Quick View for Collector */}
      {viewProfileCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{viewProfileCust.name}</h3>
                <span className="font-mono text-xs text-blue-600 font-semibold">{viewProfileCust.customer_id}</span>
              </div>
              <button onClick={() => setViewProfileCust(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <p><strong>Mobile:</strong> {viewProfileCust.phone}</p>
              <p><strong>Address:</strong> {viewProfileCust.address}</p>
              <p><strong>Road / Flat:</strong> {viewProfileCust.road_house_info || '-'}</p>
              <p><strong>Area:</strong> {viewProfileCust.area_name}</p>
              <p><strong>Package:</strong> {viewProfileCust.package_name} ({viewProfileCust.monthly_bill} BDT/mo)</p>
              <p><strong>Status:</strong> {viewProfileCust.status}</p>
              <p><strong>Current Due:</strong> <span className="font-mono font-bold text-rose-600">{viewProfileCust.current_due} BDT</span></p>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={`tel:${viewProfileCust.phone}`}
                className="flex-1 py-2 text-center bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl"
              >
                Call
              </a>
              <button
                type="button"
                onClick={() => {
                  const target = viewProfileCust;
                  setViewProfileCust(null);
                  setCollectCust(target);
                }}
                className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl text-center shadow-xs"
              >
                Collect Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Modal */}
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
