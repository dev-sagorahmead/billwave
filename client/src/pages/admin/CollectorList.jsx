import React, { useState, useEffect } from 'react';
import { api, getImageUrl } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { 
  UserCheck, PlusCircle, Phone, Mail, Key, 
  Trash2, Edit, CheckCircle2, XCircle, Wallet, 
  Users, MapPin, X, Loader2, ArrowRight, Eye, Calendar, Megaphone,
  User, Upload
} from 'lucide-react';

export default function CollectorList() {
  const { isBn, formatStatus, formatCurrency } = useLanguage();
  const [collectors, setCollectors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({
    target_type: 'collector',
    target_user_id: '',
    title: '',
    message: '',
    priority: 'normal'
  });
  const [editingCollector, setEditingCollector] = useState(null);
  const [resetPassModal, setResetPassModal] = useState(null);
  const [collectorReportModal, setCollectorReportModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    avatar: '',
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

  const handleAvatarUploadForAdd = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(isBn ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (PNG, JPG, WEBP) নির্বাচন করুন।' : 'Please select an image file (PNG, JPG, WEBP) only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(isBn ? 'ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারবে।' : 'Image size cannot exceed 5MB.');
      return;
    }
    try {
      setUploadingAvatar(true);
      const data = new FormData();
      data.append('avatar', file);
      const res = await api.uploadCollectorAvatar(data);
      if (res && res.avatarUrl) {
        setFormData(prev => ({ ...prev, avatar: res.avatarUrl }));
      }
    } catch (err) {
      alert((isBn ? 'ছবি আপলোড করতে ব্যর্থ হয়েছে: ' : 'Failed to upload photo: ') + err.message);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleAvatarUploadForEdit = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(isBn ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (PNG, JPG, WEBP) নির্বাচন করুন।' : 'Please select an image file (PNG, JPG, WEBP) only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(isBn ? 'ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারবে।' : 'Image size cannot exceed 5MB.');
      return;
    }
    try {
      setUploadingAvatar(true);
      const data = new FormData();
      data.append('avatar', file);
      const res = await api.uploadCollectorAvatar(data);
      if (res && res.avatarUrl) {
        setEditingCollector(prev => ({ ...prev, avatar: res.avatarUrl }));
      }
    } catch (err) {
      alert((isBn ? 'ছবি আপলোড করতে ব্যর্থ হয়েছে: ' : 'Failed to upload photo: ') + err.message);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleOpenEdit = (col) => {
    setEditingCollector({
      id: col.id,
      name: col.name || '',
      email: col.email || '',
      phone: col.phone || '',
      avatar: col.avatar || '',
      status: col.status || 'Active',
      joining_date: col.joining_date ? col.joining_date.split('T')[0] : new Date().toISOString().split('T')[0],
      area_ids: col.areas ? col.areas.map(a => a.id) : []
    });
  };

  const handleUpdateCollector = async (e) => {
    e.preventDefault();
    if (!editingCollector) return;
    try {
      setActionLoading(true);
      await api.updateCollector(editingCollector.id, {
        name: editingCollector.name,
        email: editingCollector.email,
        phone: editingCollector.phone,
        status: editingCollector.status,
        avatar: editingCollector.avatar,
        joining_date: editingCollector.joining_date,
        area_ids: editingCollector.area_ids
      });
      setEditingCollector(null);
      fetchData();
      alert(isBn ? 'কালেক্টরের তথ্য সফলভাবে আপডেট করা হয়েছে!' : 'Collector details updated successfully!');
    } catch (err) {
      alert((isBn ? 'কালেক্টর আপডেট করতে সমস্যা হয়েছে: ' : 'Error updating collector: ') + err.message);
    } finally {
      setActionLoading(false);
    }
  };

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
        avatar: '',
        area_ids: [],
        status: 'Active',
        joining_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
      alert(isBn ? 'নতুন কালেক্টর সফলভাবে তৈরি করা হয়েছে!' : 'New collector created successfully!');
    } catch (err) {
      alert((isBn ? 'কালেক্টর তৈরিতে ত্রুটি: ' : 'Error creating collector: ') + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert(isBn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
      return;
    }
    try {
      setActionLoading(true);
      await api.resetCollectorPassword(resetPassModal.id, newPassword);
      setResetPassModal(null);
      setNewPassword('');
      alert(isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' : 'Password reset successfully!');
    } catch (err) {
      alert((isBn ? 'ত্রুটি: ' : 'Error: ') + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (col) => {
    const nextStatus = col.status === 'Active' ? 'Inactive' : 'Active';
    const confirmMsg = col.status === 'Active'
      ? (isBn 
          ? `আপনি কি নিশ্চিত যে কালেক্টর "${col.name}" কে নিষ্ক্রিয় (Inactive) করতে চান?\n\nনিষ্ক্রিয় করলে সে মোবাইল অ্যাপে লগইন করতে পারবে না।`
          : `Are you sure you want to set collector "${col.name}" to Inactive?\n\nThey will not be able to log in.`)
      : (isBn
          ? `আপনি কি নিশ্চিত যে কালেক্টর "${col.name}" কে পুনরায় সক্রিয় (Active) করতে চান?`
          : `Are you sure you want to activate collector "${col.name}"?`);
    if (!confirm(confirmMsg)) return;
    try {
      await api.changeCollectorStatus(col.id, nextStatus);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (col) => {
    const confirmMsg = isBn
      ? `আপনি কি নিশ্চিত যে "${col.name}" কে মুছে ফেলতে চান? পূর্ববর্তী আদায় রেকর্ড সংরক্ষিত থাকবে।`
      : `Are you sure you want to remove ${col.name}? Historical collections will be preserved.`;
    if (!confirm(confirmMsg)) return;
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
      alert((isBn ? 'কালেক্টর রিপোর্ট লোড করতে ব্যর্থ হয়েছে: ' : 'Failed to load collector report: ') + err.message);
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await api.getCompanyNotices();
      setNotices(res.notices || []);
    } catch (err) {
      console.error('Error fetching collector notices:', err);
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!noticeForm.message.trim()) {
      alert(isBn ? 'অনুগ্রহ করে নোটিশের বার্তা লিখুন' : 'Please enter notice message');
      return;
    }
    try {
      setActionLoading(true);
      await api.createCompanyNotice({
        ...noticeForm,
        target_user_id: noticeForm.target_type === 'collector' ? noticeForm.target_user_id : null
      });
      setNoticeForm(prev => ({
        ...prev,
        title: '',
        message: '',
        priority: 'normal'
      }));
      fetchNotices();
      alert(isBn 
        ? 'কালেক্টর নোটিশ সফলভাবে পাঠানো হয়েছে! সংশ্লিষ্ট কালেক্টরের অ্যাপের টপ বারে এটি Marquee আকারে স্ক্রল করবে।' 
        : 'Collector notice sent successfully! It will scroll across the top bar in their app.');
    } catch (err) {
      alert((isBn ? 'ত্রুটি: ' : 'Error: ') + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleNoticeStatus = async (notice) => {
    const nextStatus = notice.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.toggleCompanyNoticeStatus(notice.id, nextStatus);
      fetchNotices();
    } catch (err) {
      alert((isBn ? 'ত্রুটি: ' : 'Error: ') + err.message);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    const confirmMsg = isBn ? 'আপনি কি নিশ্চিত যে এই নোটিশটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this notice?';
    if (!confirm(confirmMsg)) return;
    try {
      await api.deleteCompanyNotice(noticeId);
      fetchNotices();
    } catch (err) {
      alert((isBn ? 'ত্রুটি: ' : 'Error: ') + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>{isBn ? 'বিল কালেক্টর ব্যবস্থাপনা ও পারফরম্যান্স' : 'Bill Collector Management & Performance'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn 
              ? 'মাঠপর্যায়ের বিলিং কর্মী পরিচালনা, এলাকা বরাদ্দ এবং আদায় মনিটর করুন' 
              : 'Manage field billing staff, assign territory permissions, and monitor recoveries'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setShowNoticeModal(true);
              fetchNotices();
              if (collectors.length > 0 && !noticeForm.target_user_id) {
                setNoticeForm(prev => ({ ...prev, target_user_id: collectors[0].id }));
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            title={isBn ? 'কোনো নির্দিষ্ট কালেক্টর বা সকল কালেক্টরকে স্ক্রলিং নোটিশ পাঠান' : 'Broadcast scrolling marquee notice to collectors'}
          >
            <Megaphone className="w-4 h-4" />
            <span>{isBn ? 'কালেক্টর নোটিশ পাঠান' : 'Send Collector Notice'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBn ? 'নতুন কালেক্টর যোগ করুন' : 'Add New Collector'}</span>
          </button>
        </div>
      </div>

      {/* Collector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collectors.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            {isBn ? 'কোনো কালেক্টর পাওয়া যায়নি। নতুন কালেক্টর যোগ করতে উপরের বোতাম চাপুন!' : 'No collectors found. Click "Add New Collector" above!'}
          </div>
        ) : (
          collectors.map((col) => (
            <div key={col.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-emerald-300 transition-all">
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {col.avatar ? (
                      <img 
                        src={getImageUrl(col.avatar)} 
                        alt={col.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 shadow-xs ring-2 ring-slate-100 bg-white" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center shadow-xs">
                        <User className="w-6 h-6" />
                      </div>
                    )}
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

                <button
                  type="button"
                  onClick={() => handleToggleStatus(col)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    col.status === 'Active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  }`}
                  title={isBn ? 'ক্লিক করে সক্রিয়/নিষ্ক্রিয় করুন' : 'Click to toggle Active/Inactive'}
                >
                  {col.status === 'Active' 
                    ? (isBn ? '🟢 সচল (Active)' : '🟢 Active') 
                    : (isBn ? '🔴 নিষ্ক্রিয় (Inactive)' : '🔴 Inactive')}
                </button>
              </div>

              {/* Assigned Areas Badges */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'নির্ধারিত এলাকা (সীমাবদ্ধ অ্যাক্সেস):' : 'Assigned Areas (Strict Isolation):'}
                </span>
                <div className="flex flex-wrap gap-1">
                  {col.areas?.length === 0 ? (
                    <span className="text-slate-400 text-xs italic">
                      {isBn ? 'কোনো এলাকা বরাদ্দ নেই' : 'No area assigned yet'}
                    </span>
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
                  <span className="text-[10px] text-slate-500 uppercase block">{isBn ? 'আজকের আদায়' : 'Today Collected'}</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{formatCurrency(col.todayCollection || 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">{isBn ? 'চলতি মাস' : 'This Month'}</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">{formatCurrency(col.monthCollection || 0)}</span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">{isBn ? 'নির্ধারিত গ্রাহক' : 'Assigned Customers'}</span>
                  <span className="font-bold text-slate-800">{col.assignedCustomers}</span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">{isBn ? 'মোট বকেয়া' : 'Assigned Due'}</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(col.totalDue || 0)}</span>
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
                  <span>{isBn ? 'রিপোর্ট দেখুন' : 'View Full Report'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(col)}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={isBn ? 'কালেক্টরের তথ্য ও ছবি সম্পাদনা করুন' : 'Edit Collector Details & Photo'}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPassModal(col)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                    title={isBn ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(col)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                    title={isBn ? 'সক্রিয়/নিষ্ক্রিয় পরিবর্তন' : 'Toggle Active/Inactive'}
                  >
                    {col.status === 'Active' ? <XCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(col)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title={isBn ? 'কালেক্টর মুছুন' : 'Delete Collector'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Modal: Add Collector */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">{isBn ? 'নতুন বিল কালেক্টর যোগ করুন' : 'Add New Bill Collector'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollector} className="space-y-4 text-xs">
              {/* Collector Photo / Avatar */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{isBn ? 'কালেক্টরের ছবি (Photo / Avatar)' : 'Collector Photo (Avatar)'}</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative shrink-0">
                    {formData.avatar ? (
                      <img 
                        src={getImageUrl(formData.avatar)} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{formData.avatar ? (isBn ? 'ছবি পরিবর্তন' : 'Change Photo') : (isBn ? 'ছবি নির্বাচন করুন' : 'Select Photo')}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleAvatarUploadForAdd}
                          disabled={uploadingAvatar}
                        />
                      </label>
                      {formData.avatar && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs border border-rose-200"
                        >
                          {isBn ? 'রিমুভ' : 'Remove'}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isBn ? 'ছবি না দিলে স্বয়ংক্রিয়ভাবে ডিফল্ট অবতার আইকন ব্যবহার করা হবে।' : 'Default avatar will be used if no photo is uploaded.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'পুরো নাম *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isBn ? 'যেমন: কামাল হোসেন' : 'e.g. Kamal Hossain'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'ইমেইল / ইউজারনেম *' : 'Email / Username *'}</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kamal@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'ফোন নম্বর *' : 'Phone Number *'}</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01711223344"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'প্রাথমিক পাসওয়ার্ড *' : 'Initial Password *'}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isBn ? 'কমপক্ষে ৬ অক্ষর' : 'Min 6 characters'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Area assignment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBn ? 'নির্ধারিত এলাকা (কালেক্টর শুধুমাত্র এই এলাকার গ্রাহক দেখতে পারবে)' : 'Assigned Area(s) (Collector will only see customers in these areas)'}
                </label>
                <div className="border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {areas.length === 0 ? (
                    <p className="text-xs text-slate-400">{isBn ? 'কোনো এলাকা নেই' : 'No areas available'}</p>
                  ) : (
                    areas.map((a) => (
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
                    ))
                  )}
                </div>
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  {actionLoading ? (isBn ? 'তৈরি হচ্ছে...' : 'Creating...') : (isBn ? 'কালেক্টর তৈরি করুন' : 'Create Collector')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Collector */}
      {editingCollector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">{isBn ? 'কালেক্টরের তথ্য ও ছবি সম্পাদনা' : 'Edit Collector Details & Photo'}</h3>
              </div>
              <button onClick={() => setEditingCollector(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCollector} className="space-y-4 text-xs">
              {/* Collector Photo / Avatar */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{isBn ? 'কালেক্টরের ছবি (Photo / Avatar)' : 'Collector Photo (Avatar)'}</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative shrink-0">
                    {editingCollector.avatar ? (
                      <img 
                        src={getImageUrl(editingCollector.avatar)} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{editingCollector.avatar ? (isBn ? 'ছবি পরিবর্তন' : 'Change Photo') : (isBn ? 'ছবি নির্বাচন করুন' : 'Select Photo')}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleAvatarUploadForEdit}
                          disabled={uploadingAvatar}
                        />
                      </label>
                      {editingCollector.avatar && (
                        <button
                          type="button"
                          onClick={() => setEditingCollector(prev => ({ ...prev, avatar: '' }))}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs border border-rose-200"
                        >
                          {isBn ? 'রিমুভ' : 'Remove'}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isBn ? 'ছবি না থাকলে ডিফল্ট অবতার আইকন প্রদর্শিত হবে।' : 'Default avatar will be displayed if no photo exists.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'পুরো নাম *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  value={editingCollector.name}
                  onChange={(e) => setEditingCollector({ ...editingCollector, name: e.target.value })}
                  placeholder={isBn ? 'যেমন: কামাল হোসেন' : 'e.g. Kamal Hossain'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'ইমেইল / ইউজারনেম *' : 'Email / Username *'}</label>
                  <input
                    type="email"
                    required
                    value={editingCollector.email}
                    onChange={(e) => setEditingCollector({ ...editingCollector, email: e.target.value })}
                    placeholder="kamal@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'ফোন নম্বর *' : 'Phone Number *'}</label>
                  <input
                    type="text"
                    required
                    value={editingCollector.phone}
                    onChange={(e) => setEditingCollector({ ...editingCollector, phone: e.target.value })}
                    placeholder="01711223344"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'স্ট্যাটাস' : 'Status'}</label>
                  <select
                    value={editingCollector.status}
                    onChange={(e) => setEditingCollector({ ...editingCollector, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Active">{isBn ? '🟢 সচল (Active)' : '🟢 Active'}</option>
                    <option value="Inactive">{isBn ? '🔴 নিষ্ক্রিয় (Inactive)' : '🔴 Inactive'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'যোগদানের তারিখ' : 'Joining Date'}</label>
                  <input
                    type="date"
                    value={editingCollector.joining_date}
                    onChange={(e) => setEditingCollector({ ...editingCollector, joining_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Area assignment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBn ? 'নির্ধারিত এলাকা (কালেক্টর শুধুমাত্র এই এলাকার গ্রাহক দেখতে পারবে)' : 'Assigned Area(s) (Collector will only see customers in these areas)'}
                </label>
                <div className="border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {areas.length === 0 ? (
                    <p className="text-xs text-slate-400">{isBn ? 'কোনো এলাকা নেই' : 'No areas available'}</p>
                  ) : (
                    areas.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={editingCollector.area_ids?.includes(a.id)}
                          onChange={(e) => {
                            const current = editingCollector.area_ids || [];
                            if (e.target.checked) {
                              setEditingCollector(prev => ({ ...prev, area_ids: [...current, a.id] }));
                            } else {
                              setEditingCollector(prev => ({ ...prev, area_ids: current.filter(id => id !== a.id) }));
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{a.name} ({a.code})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCollector(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || uploadingAvatar}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{actionLoading ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'আপডেট করুন' : 'Update Collector')}</span>
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
              {isBn ? `${resetPassModal.name} - এর পাসওয়ার্ড রিসেট করুন` : `Reset Password for ${resetPassModal.name}`}
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'নতুন পাসওয়ার্ড' : 'New Password'}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isBn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPassModal(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md shadow-amber-600/20"
                >
                  {actionLoading ? (isBn ? 'রিসেট হচ্ছে...' : 'Resetting...') : (isBn ? 'রিসেট নিশ্চিত করুন' : 'Confirm Reset')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Collector Full Performance Report */}
      {collectorReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto my-6">
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isBn ? `কালেক্টর পারফরম্যান্স রিপোর্ট: ${collectorReportModal.collector.name}` : `Collector Performance: ${collectorReportModal.collector.name}`}
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
                <span className="text-slate-500 block">{isBn ? 'আজকের আদায়' : "Today's Collection"}</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {formatCurrency(collectorReportModal.stats.todayCollection || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">{isBn ? 'চলতি মাস' : 'This Month'}</span>
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {formatCurrency(collectorReportModal.stats.monthCollection || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">{isBn ? 'সর্বমোট আদায়' : 'Lifetime Total'}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(collectorReportModal.stats.totalCollection || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">{isBn ? 'মোট লেনদেন' : 'Transactions'}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {collectorReportModal.stats.totalTxCount}
                </span>
              </div>
            </div>

            {/* Assigned Areas and Customer info */}
            <div className="text-xs space-y-1">
              <span className="font-semibold text-slate-700 block">{isBn ? 'নির্ধারিত এলাকা:' : 'Assigned Territory:'}</span>
              <div className="flex gap-2 flex-wrap">
                {collectorReportModal.areas.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">{isBn ? 'কোনো এলাকা নেই' : 'No areas'}</span>
                ) : (
                  collectorReportModal.areas.map(a => (
                    <span key={a.id} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                      {a.name} ({a.code})
                    </span>
                  ))
                )}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {isBn 
                  ? `নির্ধারিত গ্রাহক: ${collectorReportModal.stats.assignedCustomers} জন • বর্তমান বকেয়া: ${formatCurrency(collectorReportModal.stats.totalDue || 0)}`
                  : `Assigned Customers: ${collectorReportModal.stats.assignedCustomers} • Outstanding Balance: ${formatCurrency(collectorReportModal.stats.totalDue || 0)}`}
              </p>
            </div>

            {/* Collection History Table */}
            <div>
              <h4 className="font-semibold text-xs text-slate-700 mb-2">{isBn ? 'আদায়ের ইতিহাস লগ:' : 'Collection History Log:'}</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="p-2">{isBn ? 'তারিখ' : 'Date'}</th>
                      <th className="p-2">{isBn ? 'রসিদ' : 'Receipt'}</th>
                      <th className="p-2">{isBn ? 'গ্রাহক' : 'Customer'}</th>
                      <th className="p-2">{isBn ? 'পরিমাণ' : 'Amount'}</th>
                      <th className="p-2">{isBn ? 'মাধ্যম' : 'Method'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collectorReportModal.history.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-400">{isBn ? 'কোনো লেনদেন রেকর্ড নেই' : 'No transactions recorded'}</td>
                      </tr>
                    ) : (
                      collectorReportModal.history.map(h => (
                        <tr key={h.id}>
                          <td className="p-2">{h.payment_date}</td>
                          <td className="p-2 font-mono text-[11px] text-blue-600">{h.receipt_number}</td>
                          <td className="p-2 font-bold">{h.customer_name}</td>
                          <td className="p-2 font-mono font-bold text-emerald-600">+{formatCurrency(h.paid_amount || 0)}</td>
                          <td className="p-2">{h.payment_method}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCollectorReportModal(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              {isBn ? 'রিপোর্ট বন্ধ করুন' : 'Close Report'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Notice to Collector */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <span>{isBn ? 'কালেক্টর নোটিশ ও স্ক্রলিং বার্তা পাঠান' : 'Send Collector Notice & Scrolling Marquee'}</span>
              </h3>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Broadcast Form */}
            <form onSubmit={handleCreateNotice} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{isBn ? 'টার্গেট প্রাপক (Recipient) *' : 'Target Recipient *'}</label>
                  <select
                    value={noticeForm.target_type}
                    onChange={(e) => setNoticeForm({ ...noticeForm, target_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="collector">{isBn ? 'নির্দিষ্ট কালেক্টর (Single Collector)' : 'Single Collector'}</option>
                    <option value="all_collectors">{isBn ? 'সকল কালেক্টর (All Collectors)' : 'All Collectors'}</option>
                  </select>
                </div>

                {noticeForm.target_type === 'collector' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{isBn ? 'কালেক্টর নির্বাচন করুন *' : 'Select Collector *'}</label>
                    <select
                      value={noticeForm.target_user_id}
                      onChange={(e) => setNoticeForm({ ...noticeForm, target_user_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">{isBn ? 'কালেক্টর সিলেক্ট করুন...' : 'Select a collector...'}</option>
                      {collectors.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{isBn ? 'নোটিশের শিরোনাম (Title) - ঐচ্ছিক' : 'Notice Title - Optional'}</label>
                  <input
                    type="text"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    placeholder={isBn ? 'যেমন: আজকের কালেকশন আপডেট / জরুরি নির্দেশনা' : 'e.g. Daily Collection Update / Urgent Notice'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{isBn ? 'গুরুত্ব (Priority)' : 'Priority'}</label>
                  <select
                    value={noticeForm.priority}
                    onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="normal">{isBn ? 'সাধারণ (Normal - Green)' : 'Normal (Green)'}</option>
                    <option value="warning">{isBn ? 'সতর্কতা (Warning - Orange)' : 'Warning (Orange)'}</option>
                    <option value="urgent">{isBn ? 'জরুরি (Urgent - Red)' : 'Urgent (Red)'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{isBn ? 'নোটিশের বার্তা (Marquee Message) *' : 'Notice Message (Marquee) *'}</label>
                <textarea
                  required
                  rows={2}
                  value={noticeForm.message}
                  onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                  placeholder={isBn ? 'যে বার্তাটি কালেক্টরের মোবাইল অ্যাপের টপ বারে স্ক্রল করবে...' : 'Message that scrolls in the collector app top bar...'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>{actionLoading ? (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (isBn ? 'কালেক্টর নোটিশ পাঠান' : 'Send Notice')}</span>
                </button>
              </div>
            </form>

            {/* List of Sent Collector Notices */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                <span>{isBn ? `পূর্ববর্তী প্রেরিত নোটিশ তালিকা (${notices.length})` : `Previously Sent Notices (${notices.length})`}</span>
              </h4>

              {notices.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl">{isBn ? 'কোনো নোটিশ পাঠানো হয়নি' : 'No notices sent yet'}</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {notices.map(n => (
                    <div key={n.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            n.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                            n.priority === 'warning' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {n.target_type === 'all_collectors' ? (isBn ? 'সকল কালেক্টর' : 'All Collectors') : (n.target_collector_name || (isBn ? 'কালেক্টর' : 'Collector'))}
                          </span>
                          {n.title && <span className="font-bold text-slate-900">[{n.title}]</span>}
                          <span className="text-[10px] text-slate-400">{n.created_at}</span>
                        </div>
                        <p className="text-slate-600 leading-snug">{n.message}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleNoticeStatus(n)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                            n.status === 'Active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={isBn ? 'ক্লিক করে সক্রিয়/নিষ্ক্রিয় করুন' : 'Click to toggle Active/Inactive'}
                        >
                          {n.status === 'Active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotice(n.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title={isBn ? 'মুছুন' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNoticeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
