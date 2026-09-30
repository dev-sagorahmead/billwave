import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Settings, ImageIcon, Upload, CheckCircle2, AlertCircle, 
  ExternalLink, Eye, RefreshCw, Sliders, Type, Palette, 
  Sparkles, Save, ShieldCheck, ArrowRight, Lock, User, Check, LayoutDashboard, Building2
} from 'lucide-react';

export default function SuperAdminSettings() {
  const { isBn, t } = useLanguage();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'success' });
  const [previewLang, setPreviewLang] = useState('bn');

  // Form State
  const [settings, setSettings] = useState({
    login_logo: '/uploads/billwave-logo.png',
    login_logo_bg: 'white',
    login_logo_height: '56',
    login_brand_title: 'BillWave',
    login_brand_subtitle: 'Manage. Collect. Grow.',
    login_card_title_bn: 'অ্যাকাউন্টে প্রবেশ করুন',
    login_card_title_en: 'Sign in to your account',
    login_card_subtitle_bn: 'আপনার ইউজারনেম, ইমেইল, মোবাইল বা গ্রাহক আইডি লিখুন',
    login_card_subtitle_en: 'Enter your Username, Email, Phone, or Customer ID',
    login_footer_text: '© 2026 BillWave. All rights reserved.',
    login_bg_theme: 'light'
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSuperAdminSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setMessage({
        text: isBn ? 'সেটিংস লোড করতে সমস্যা হয়েছে' : 'Failed to load settings',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(isBn ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল আপলোড করুন' : 'Please upload an image file only');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      const res = await api.uploadLoginLogo(formData);
      if (res && res.logoUrl) {
        setSettings(prev => ({
          ...prev,
          login_logo: res.logoUrl
        }));
        setMessage({
          text: isBn ? 'লোগো সফলভাবে আপলোড ও আপডেট হয়েছে!' : 'Logo uploaded successfully!',
          type: 'success'
        });
        setTimeout(() => setMessage({ text: '', type: 'success' }), 4000);
      }
    } catch (err) {
      alert((isBn ? 'লোগো আপলোড ব্যর্থ হয়েছে: ' : 'Failed to upload logo: ') + err.message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUseBillWaveDefault = () => {
    setSettings(prev => ({
      ...prev,
      login_logo: '/uploads/billwave-logo.png',
      login_logo_bg: 'white',
      login_logo_height: '56',
      login_brand_title: 'BillWave',
      login_brand_subtitle: 'Manage. Collect. Grow.'
    }));
    setMessage({
      text: isBn ? 'সংযুক্ত BillWave লোগো সিলেক্ট করা হয়েছে! পরিবর্তন সেভ করতে "সেভ করুন" চাপুন।' : 'Connected BillWave logo selected! Click Save to apply.',
      type: 'success'
    });
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000);
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      await api.updateSuperAdminSettings(settings);
      setMessage({
        text: isBn ? 'সকল লগইন পেজ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'All login page settings saved successfully!',
        type: 'success'
      });
      setTimeout(() => setMessage({ text: '', type: 'success' }), 4000);
    } catch (err) {
      setMessage({
        text: (isBn ? 'সেটিংস সেভ করতে ব্যর্থ: ' : 'Failed to save settings: ') + err.message,
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-12">
      
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <Link
          to="/superadmin"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span>{isBn ? 'ওভারভিউ ও কোম্পানি তালিকা' : 'Overview & Companies'}</span>
        </Link>
        <Link
          to="/superadmin/settings"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md shadow-purple-600/25 transition-all shrink-0"
        >
          <Settings className="w-4 h-4" />
          <span>{isBn ? 'লগইন পেজ এডিটর ও লোগো সেটিংস' : 'Login Page & Logo Settings'}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{isBn ? 'সুপার এডমিন কন্ট্রোল' : 'Super Admin Control'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-600" />
            <span>{isBn ? 'লগইন পেজ এডিটর ও প্ল্যাটফর্ম ব্র্যান্ডিং' : 'Login Page Customizer & Branding'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isBn 
              ? 'এখানে আপনি মূল লগইন পেজের লোগো, ব্র্যান্ড নাম, স্লোগান, কার্ড টাইটেল ও থিম নিজের পছন্দমতো সাজাতে পারবেন।'
              : 'Customize the public login screen logo, brand title, subtitle, card instructions, and styling.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isBn ? 'লাইভ লগইন পেজ দেখুন' : 'View Live Login'}</span>
          </a>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
          message.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Left Editor Controls, Right Live Screen Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Logo & Branding Graphic */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <span>{isBn ? '১. লগইন পেজের লোগো ব্যবস্থাপনা' : '1. Login Page Logo Management'}</span>
              </h2>
              <span className="text-[11px] text-purple-600 bg-purple-50 font-semibold px-2 py-0.5 rounded-md">
                {isBn ? 'সবার জন্য দৃশ্যমান' : 'Public Asset'}
              </span>
            </div>

            {/* Current Logo View & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className={`p-3 rounded-xl border transition-all flex items-center justify-center shrink-0 min-w-[140px] ${
                settings.login_logo_bg === 'white' 
                  ? 'bg-white border-slate-200 shadow-sm' 
                  : settings.login_logo_bg === 'slate'
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-transparent border-dashed border-slate-300'
              }`}>
                {settings.login_logo ? (
                  <img 
                    src={settings.login_logo} 
                    alt="Login Logo Preview" 
                    style={{ height: `${settings.login_logo_height || 56}px` }}
                    className="w-auto object-contain max-w-[180px]"
                    onError={(e) => {
                      if (e.target.src.indexOf('/billwave-logo.png') === -1) {
                        e.target.src = '/billwave-logo.png';
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-medium">{isBn ? 'কোনো লোগো নেই' : 'No Logo'}</span>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                <div className="text-xs font-bold text-slate-800">
                  {isBn ? 'বর্তমান সক্রিয় লোগো' : 'Current Active Logo'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                  {settings.login_logo || 'billwave-logo.png'}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{uploadingLogo ? (isBn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (isBn ? 'নতুন লোগো আপলোড' : 'Upload New Logo')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseBillWaveDefault}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="ইউজার কর্তৃক সংযুক্ত BillWave লোগো সেট করুন"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isBn ? 'সংযুক্ত BillWave লোগো দিন' : 'Set Attached BillWave Logo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Logo Display Styling Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isBn ? 'লোগো ব্যাজ ব্যাকগ্রাউন্ড' : 'Logo Container Background'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('login_logo_bg', 'white')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                      settings.login_logo_bg === 'white'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-2xs ring-1 ring-purple-600'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isBn ? 'সাদা কার্ড' : 'White Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('login_logo_bg', 'slate')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                      settings.login_logo_bg === 'slate'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-2xs ring-1 ring-purple-600'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isBn ? 'ডার্ক স্লেট' : 'Dark Slate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('login_logo_bg', 'transparent')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                      settings.login_logo_bg === 'transparent'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-2xs ring-1 ring-purple-600'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isBn ? 'স্বচ্ছ' : 'Transparent'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBn ? '* ডার্ক লগইন স্ক্রিনের উপর স্পষ্ট দেখার জন্য "সাদা কার্ড" রেকমেন্ডেড।' : '* White card ensures optimal contrast on dark login screens.'}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isBn ? 'লোগো উচ্চতা (সাইজ)' : 'Logo Height (Size)'}
                  </label>
                  <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    {settings.login_logo_height || 56}px
                  </span>
                </div>
                <input
                  type="range"
                  min="36"
                  max="90"
                  step="2"
                  value={settings.login_logo_height || 56}
                  onChange={(e) => handleChange('login_logo_height', e.target.value)}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>36px (ছোট)</span>
                  <span>56px (স্ট্যান্ডার্ড)</span>
                  <span>90px (বড়)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Brand Titles & Slogans */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-600" />
                <span>{isBn ? '২. ব্র্যান্ড নাম ও ট্যাগলাইন (স্লোগান)' : '2. Brand Titles & Slogans'}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'ব্র্যান্ড শিরোনাম (Brand Title)' : 'Brand Title'}
                </label>
                <input
                  type="text"
                  value={settings.login_brand_title || ''}
                  onChange={(e) => handleChange('login_brand_title', e.target.value)}
                  placeholder="e.g. BillWave"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'ব্র্যান্ড সাবটাইটেল / স্লোগান' : 'Brand Subtitle / Slogan'}
                </label>
                <input
                  type="text"
                  value={settings.login_brand_subtitle || ''}
                  onChange={(e) => handleChange('login_brand_subtitle', e.target.value)}
                  placeholder="e.g. Manage. Collect. Grow."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Login Card Titles & Prompts (Bilingual BN & EN) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>{isBn ? '৩. লগইন কার্ডের নির্দেশিকা টেক্সট (বাংলা ও ইংরেজি)' : '3. Login Card Texts (Bengali & English)'}</span>
              </h2>
            </div>

            {/* Bangla Text */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{isBn ? 'বাংলা সংস্করণ (ডিফল্ট)' : 'Bengali Version (Default)'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">কার্ড টাইটেল (বাংলা)</label>
                  <input
                    type="text"
                    value={settings.login_card_title_bn || ''}
                    onChange={(e) => handleChange('login_card_title_bn', e.target.value)}
                    placeholder="অ্যাকাউন্টে প্রবেশ করুন"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">কার্ড সাবটাইটেল (বাংলা)</label>
                  <input
                    type="text"
                    value={settings.login_card_subtitle_bn || ''}
                    onChange={(e) => handleChange('login_card_subtitle_bn', e.target.value)}
                    placeholder="আপনার ইউজারনেম, ইমেইল, মোবাইল বা গ্রাহক আইডি লিখুন"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
              </div>
            </div>

            {/* English Text */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>{isBn ? 'ইংরেজি সংস্করণ' : 'English Version'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Card Title (English)</label>
                  <input
                    type="text"
                    value={settings.login_card_title_en || ''}
                    onChange={(e) => handleChange('login_card_title_en', e.target.value)}
                    placeholder="Sign in to your account"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Card Subtitle (English)</label>
                  <input
                    type="text"
                    value={settings.login_card_subtitle_en || ''}
                    onChange={(e) => handleChange('login_card_subtitle_en', e.target.value)}
                    placeholder="Enter your Username, Email, Phone, or Customer ID"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Footer & Theme */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <span>{isBn ? '৪. ফুটার ও ব্যাকগ্রাউন্ড থিম' : '4. Footer & Theme Styling'}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'কপিরাইট ও ফুটার টেক্সট' : 'Footer Copyright Text'}
                </label>
                <input
                  type="text"
                  value={settings.login_footer_text || ''}
                  onChange={(e) => handleChange('login_footer_text', e.target.value)}
                  placeholder="© 2026 BillWave. All rights reserved."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'লগইন ব্যাকগ্রাউন্ড থিম' : 'Background Theme Style'}
                </label>
                <select
                  value={settings.login_bg_theme || 'light'}
                  onChange={(e) => handleChange('login_bg_theme', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                >
                  <option value="light">লাইট কালার থিম (Light Modern - ডিফল্ট, মোবাইল অ্যাপ ডিজাইন)</option>
                  <option value="slate-dark">Slate Dark (ডার্ক স্লেট)</option>
                  <option value="indigo-dark">Indigo Deep (গভীর নীল ও গ্লো)</option>
                  <option value="neutral-dark">Neutral Dark (মিনিমাল কালো)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isBn ? 'সকল সেটিংস সেভ করুন' : 'Save All Settings'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Live Mockup Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">
                  {isBn ? 'লাইভ লগইন স্ক্রিন প্রিভিউ' : 'Live Login Screen Preview'}
                </span>
              </div>

              {/* Language Switcher for Preview */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewLang('bn')}
                  className={`px-2 py-0.5 rounded-md transition-all ${previewLang === 'bn' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  বাংলা
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLang('en')}
                  className={`px-2 py-0.5 rounded-md transition-all ${previewLang === 'en' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Simulated Mobile Login Page Canvas */}
            <div className={`w-full rounded-2xl p-4 relative overflow-hidden text-center border transition-all ${
              settings.login_bg_theme === 'light' || !settings.login_bg_theme
                ? 'bg-[#F2F4F8] border-slate-200'
                : 'bg-slate-950 border-slate-800'
            }`}>
              
              {/* Mobile Device Frame */}
              <div className="relative z-10 max-w-[280px] mx-auto rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-white flex flex-col text-left">
                
                {/* Top Header with Brand Gradient */}
                <div className="bg-gradient-to-br from-[#061224] via-[#0b244d] to-[#0284c7] text-white p-4 pb-7 relative overflow-hidden">
                  
                  {/* Logo Badge */}
                  {settings.login_logo ? (
                    <div className="mb-2">
                      <div className={`p-1.5 rounded-xl shadow-xs transition-all ${
                        settings.login_logo_bg === 'white'
                          ? 'bg-white shadow-black/10'
                          : settings.login_logo_bg === 'slate'
                          ? 'bg-slate-900/80 border border-slate-700'
                          : 'bg-transparent'
                      } inline-flex items-center justify-center`}>
                        <img 
                          src={settings.login_logo} 
                          alt="Logo Preview" 
                          style={{ height: `${Math.min(Number(settings.login_logo_height) || 40, 38)}px` }}
                          className="w-auto object-contain max-w-[140px]"
                          onError={(e) => {
                            if (e.target.src.indexOf('/billwave-logo.png') === -1) {
                              e.target.src = '/billwave-logo.png';
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Greeting Text */}
                  <h3 className="text-xl font-black text-white leading-tight">
                    {previewLang === 'bn' ? 'স্বাগতম' : 'Hello'}
                    <br />
                    <span className="text-cyan-300 font-extrabold">
                      {previewLang === 'bn' ? 'লগইন করুন!' : 'Sign in!'}
                    </span>
                  </h3>
                </div>

                {/* Bottom Sheet Card */}
                <div className="rounded-t-2xl bg-white p-4 -mt-3 relative z-10 flex-1 space-y-3">
                  
                  {/* Underline Input 1 */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#0c234b] mb-0.5">
                      {previewLang === 'bn' ? 'ইউজারনেম / ইমেইল' : 'Gmail / Username'}
                    </label>
                    <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">user@example.com</span>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  </div>

                  {/* Underline Input 2 */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#0c234b] mb-0.5">
                      {previewLang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                    </label>
                    <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">••••••••</span>
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-right text-[9px] text-slate-400 font-semibold pt-1">
                      {previewLang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                    </div>
                  </div>

                  {/* Pill Button */}
                  <div className="pt-1">
                    <div className="w-full py-2 rounded-full font-black text-[11px] tracking-wider uppercase text-white bg-gradient-to-r from-[#071326] via-[#0d2347] to-[#0284c7] shadow-md shadow-blue-900/25 flex items-center justify-center">
                      {previewLang === 'bn' ? 'লগইন করুন' : 'SIGN IN'}
                    </div>
                  </div>

                  {/* Footer prompt */}
                  <div className="text-center text-[9px] text-slate-400 pt-1">
                    <span>{previewLang === 'bn' ? 'অ্যাকাউন্ট নেই? ' : "Don't have account? "}</span>
                    <span className="font-bold text-[#0c234b]">
                      {previewLang === 'bn' ? 'সাইন আপ' : 'Sign up'}
                    </span>
                  </div>

                </div>

              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>{isBn ? 'রিয়েলটাইম লাইভ পরিবর্তন সক্রিয়' : 'Real-time live changes active'}</span>
              <a 
                href="/login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
              >
                <span>{isBn ? 'লগইন খুলুন' : 'Open Login'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
