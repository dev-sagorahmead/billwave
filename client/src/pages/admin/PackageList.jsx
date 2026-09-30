import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Package, PlusCircle, Edit, Trash2, CheckCircle2, 
  XCircle, Users, X, Loader2, DollarSign 
} from 'lucide-react';

export default function PackageList() {
  const { isBn, formatStatus, formatCurrency } = useLanguage();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState(150);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await api.getPackages();
      setPackages(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.createPackage({ name, price, description, status });
      setShowAddModal(false);
      setName('');
      setPrice(150);
      setDescription('');
      fetchPackages();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPackage = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.updatePackage(editingPkg.id, editingPkg);
      setEditingPkg(null);
      fetchPackages();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (pkg) => {
    const confirmMsg = isBn 
      ? `আপনি কি নিশ্চিত যে "${pkg.name}" প্যাকেজটি মুছে ফেলতে চান?` 
      : `Are you sure you want to delete package "${pkg.name}"?`;
    if (!confirm(confirmMsg)) return;
    try {
      await api.deletePackage(pkg.id);
      fetchPackages();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>{isBn ? 'ক্যাবল টিভি প্যাকেজ ও ট্যারিফ ব্যবস্থাপনা' : 'Cable TV Package & Tariff Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'সাবস্ক্রিপশন প্যাকেজ, মাসিক রেট ও বিবরণ পরিচালনা করুন' 
              : 'Configure subscription packages, channel tiers, and monthly rates'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isBn ? 'নতুন প্যাকেজ তৈরি' : 'Create New Package'}</span>
        </button>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            {isBn ? 'কোনো প্যাকেজ নেই। নতুন প্যাকেজ যোগ করতে উপরের বোতাম চাপুন!' : 'No packages found. Click "Create New Package" above!'}
          </div>
        ) : (
          packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition-all flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h2 className="font-bold text-base text-slate-900">{pkg.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    pkg.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {formatStatus(pkg.status)}
                  </span>
                </div>

                <div>
                  <span className="text-2xl font-black font-mono text-indigo-600">
                    {formatCurrency(pkg.price || 0)}
                  </span>
                  <span className="text-xs text-slate-500"> / {isBn ? 'মাস' : 'month'}</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                  {pkg.description || (isBn ? 'সাধারণ ডিজিটাল ক্যাবল কানেকশন' : 'Standard digital cable connection')}
                </p>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isBn ? 'গ্রাহক সংখ্যা' : 'Subscribers'}</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {pkg.subscriber_count} ({pkg.active_subscriber_count} {isBn ? 'সক্রিয়' : 'Active'})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingPkg(pkg)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                  title={isBn ? 'প্যাকেজ সম্পাদনা' : 'Edit Package'}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pkg)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  title={isBn ? 'প্যাকেজ মুছুন' : 'Delete Package'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Modal: Create Package */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">{isBn ? 'নতুন প্যাকেজ তৈরি' : 'Create New Package'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'প্যাকেজের নাম *' : 'Package Name *'}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? 'যেমন: রেগুলার, প্রিমিয়াম, বেসিক, ফ্রি' : 'e.g. Regular, Premium, Basic, Free'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'মাসিক মূল্য (টাকা) *' : 'Monthly Price (BDT) *'}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="150"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'বিবরণ' : 'Description'}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isBn ? 'যেমন: ৮০+ চ্যানেল ও স্পোর্টস' : 'e.g. 80+ Channels with HD Sports'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
                >
                  {actionLoading ? (isBn ? 'তৈরি হচ্ছে...' : 'Creating...') : (isBn ? 'প্যাকেজ তৈরি করুন' : 'Create Package')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Package */}
      {editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">{isBn ? 'প্যাকেজ সম্পাদনা' : 'Edit Package'}</h3>
              <button onClick={() => setEditingPkg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPackage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'প্যাকেজের নাম *' : 'Package Name *'}</label>
                <input
                  type="text"
                  required
                  value={editingPkg.name}
                  onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'মাসিক মূল্য (টাকা) *' : 'Monthly Price (BDT) *'}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={editingPkg.price}
                  onChange={(e) => setEditingPkg({ ...editingPkg, price: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'বিবরণ' : 'Description'}</label>
                <input
                  type="text"
                  value={editingPkg.description || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPkg(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
                >
                  {actionLoading ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
