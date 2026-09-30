import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, Save, CheckCircle2, Building2, Phone, Mail, MapPin, 
  Upload, Image as ImageIcon, Trash2, ExternalLink, RefreshCw, Eye, AlertCircle, Globe
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function CompanySettings() {
  const { company: authCompany, updateCompanyData } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    phone: '',
    email: '',
    address: '',
    customer_prefix: 'FCN',
    logo: '',
    notes: '',
    language: language || 'bn'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [logoInputMode, setLogoInputMode] = useState('upload'); // 'upload' | 'url'
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErrorMsg('');
        const data = await api.getCompanySettings();
        setFormData({
          name: data.name || '',
          owner_name: data.owner_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          customer_prefix: data.customer_prefix || 'FCN',
          logo: data.logo || '',
          notes: data.notes || '',
          language: data.language || language || 'bn'
        });
      } catch (err) {
        console.error('Failed to load company settings:', err);
        setErrorMsg('কোম্পানি সেটিংস লোড করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLanguageSelect = (lang) => {
    setFormData(prev => ({ ...prev, language: lang }));
    changeLanguage(lang);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারবে');
      return;
    }

    try {
      setUploadingLogo(true);
      setErrorMsg('');
      const data = new FormData();
      data.append('logo', file);

      const res = await api.uploadCompanyLogo(data);
      if (res && res.logoUrl) {
        setFormData(prev => ({ ...prev, logo: res.logoUrl }));
        if (res.company && updateCompanyData) {
          updateCompanyData(res.company);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      alert('লোগো আপলোড করতে ব্যর্থ হয়েছে: ' + (err.message || 'Upload error'));
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে লোগোটি রিমুভ করতে চান?')) {
      setFormData(prev => ({ ...prev, logo: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await api.updateCompanySettings(formData);
      
      // Update global AuthContext state so the Navbar & Sidebar reflect the new logo and details instantly
      if (res && res.company && updateCompanyData) {
        updateCompanyData(res.company);
      } else if (updateCompanyData) {
        updateCompanyData({ ...authCompany, ...formData });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error('Update settings error:', err);
      setErrorMsg('সেটিংস সংরক্ষণ করতে ব্যর্থ: ' + (err.message || 'Failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">কোম্পানি সেটিংস লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>কোম্পানি প্রোফাইল, লোগো ও ব্র্যান্ডিং সেটিংস</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            কোম্পানির যাবতীয় তথ্য, লোগো, যোগাযোগের ঠিকানা এবং রশিদের ফুটার নোটিশ পরিবর্তন করুন
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>সেটিংস সফলভাবে আপডেট হয়েছে ও নেভবারে যুক্ত হয়েছে!</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Navbar Preview Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
            <Eye className="w-4 h-4 text-blue-400" />
            <span>লাইভ নেভবার প্রিভিউ (Live Navbar Preview)</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            উপরে টপ বারে আপনার লোগো যেভাবে বড় আকারে প্রদর্শিত হবে
          </span>
        </div>

        {/* Mock Navbar Display */}
        <div className="bg-white rounded-xl p-3 sm:px-4 flex items-center justify-between shadow-inner h-16">
          <div className="flex items-center min-w-0 pr-2 h-full">
            {formData.logo ? (
              <div className="flex items-center h-full py-0.5">
                <img 
                  src={formData.logo} 
                  alt="Company Logo Preview" 
                  className="h-12 sm:h-14 md:h-[58px] max-h-[58px] w-auto max-w-[220px] sm:max-w-[340px] md:max-w-[420px] object-contain object-left transition-all"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base leading-tight">
                      {formData.name || 'আপনার কোম্পানির নাম'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formData.phone ? `সাপোর্ট: ${formData.phone}` : 'সাপোর্ট নম্বর যোগ করুন'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              Company Admin
            </span>
            <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Live Preview
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Logo Upload & Visuals (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>কোম্পানি লোগো (Brand Logo)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              নেভবার, সাইডবার ও বিল রশিদের জন্য আপনার লোগো যুক্ত করুন
            </p>
          </div>

          {/* Logo Display Box */}
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
            {formData.logo ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-2xl bg-white border border-slate-200 p-2 shadow-sm flex items-center justify-center overflow-hidden">
                  <img 
                    src={formData.logo} 
                    alt="Uploaded Company Logo" 
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>লোগো মুছুন</span>
                  </button>
                  {formData.logo.startsWith('/') && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Saved)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-2 text-slate-400">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Building2 className="w-10 h-10" />
                </div>
                <p className="text-xs font-medium text-slate-500">কোনো লোগো আপলোড করা নেই</p>
                <p className="text-[11px] text-slate-400">PNG, JPG, WEBP বা SVG (সর্বোচ্চ 5MB)</p>
              </div>
            )}
          </div>

          {/* Mode Switcher: Upload File or Direct Image URL */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLogoInputMode('upload')}
              className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                logoInputMode === 'upload' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ফাইল আপলোড
            </button>
            <button
              type="button"
              onClick={() => setLogoInputMode('url')}
              className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                logoInputMode === 'url' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              অনলাইন ইমেজ লিংক
            </button>
          </div>

          {/* File Upload Input */}
          {logoInputMode === 'upload' ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
                id="company-logo-file-input"
              />
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold border border-blue-200 transition-colors text-xs disabled:opacity-50"
              >
                {uploadingLogo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>লোগো আপলোড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>লোগো ফাইল নির্বাচন করুন</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                কম্পিউটার বা মোবাইল থেকে লোগো ছবি সিলেক্ট করলে সরাসরি সেভ হয়ে নেভবারে যুক্ত হবে
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                ইমেজ URL লিংক লিখুন
              </label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                যেকোনো পাবলিক ইমেজ বা হোস্ট করা লোগোর লিঙ্ক দিতে পারেন
              </p>
            </div>
          )}

        </div>

        {/* Right Column: Company Details Edit Form (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>কোম্পানির সাধারণ তথ্য ও সেটিংস সম্পাদনা</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              এখানে পরিবর্তন করা তথ্যসমূহ গ্রাহকদের বিল রশিদে ও সিস্টেমে প্রদর্শিত হবে
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            
            {/* System Language Selector */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 text-xs">
                      {t('settings.languageTitle', 'সিস্টেমের ভাষা পরিবর্তন (System Language)')}
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('settings.languageDesc', 'সিস্টেমের ডিফল্ট ভাষা বাংলা। আপনি চাইলে এটি ইংরেজিতে পরিবর্তন করতে পারেন। নির্বাচিত ভাষাটি সমগ্র সিস্টেমে কার্যকরী হবে।')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Bengali Option */}
                <div 
                  onClick={() => handleLanguageSelect('bn')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    formData.language === 'bn' 
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇧🇩</span>
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>বাংলা (Bengali)</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">ডিফল্ট</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t('settings.bengaliDesc', 'সবকিছু বাংলা ভাষায় দেখতে')}
                      </p>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="system_language" 
                    checked={formData.language === 'bn'} 
                    onChange={() => handleLanguageSelect('bn')} 
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* English Option */}
                <div 
                  onClick={() => handleLanguageSelect('en')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    formData.language === 'en' 
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇬🇧</span>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        English (ইংরেজি)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t('settings.englishDesc', 'Display system in English')}
                      </p>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="system_language" 
                    checked={formData.language === 'en'} 
                    onChange={() => handleLanguageSelect('en')} 
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Row 1: Company Name & Owner Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  কোম্পানির নাম (Company Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: Friends Cable Network"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  মালিক / পরিচালকের নাম (Owner / Director) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ সাগর আহমেদ"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Row 2: Support Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  সাপোর্ট ফোন নম্বর (রশিদে প্রিন্ট হবে) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="017xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  অফিসিয়াল ইমেইল (Company Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="office@cable.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Customer Prefix & Office Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block font-bold text-slate-700 mb-1.5">
                  গ্রাহক আইডি প্রিফিক্স (Prefix)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="যেমন: FCN"
                  value={formData.customer_prefix}
                  onChange={(e) => setFormData({ ...formData, customer_prefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl uppercase font-mono font-bold tracking-wider text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  যেমন: {formData.customer_prefix || 'DSN'}-000001
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1.5">
                  অফিস / ক্যাবল নেটওয়ার্কের ঠিকানা (রশিদে প্রিন্ট হবে)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="রোড নং, এলাকা, থানা, জেলা"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Receipt Footer Notice */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                বিল রশিদের ফুটারে বিশেষ নোটিশ / শর্তাবলী (Receipt Notice)
              </label>
              <textarea
                rows={3}
                placeholder="যেমন: প্রতি মাসের ১০ তারিখের মধ্যে বকেয়া পরিশোধ করুন। সংযোগ বিচ্ছিন্ন থাকলে অফিসে যোগাযোগ করুন।"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                এই বার্তাটি গ্রাহককে প্রদান করা প্রতিটি রশিদের নিচে প্রিন্ট হবে
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-between">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 text-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>সেটিংস সেভ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>কোম্পানি সেটিংস সেভ করুন (Save Changes)</span>
                  </>
                )}
              </button>

              {saved && (
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সংরক্ষিত ও আপডেট সম্পন্ন!</span>
                </div>
              )}
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
