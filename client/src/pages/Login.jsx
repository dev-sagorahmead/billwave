import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { api, getImageUrl } from '../utils/api';
import { 
  Lock, Eye, EyeOff, Loader2, Check, MessageCircle, Phone, X
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { isBn } = useLanguage();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);

  // Dynamic Login Page Branding from Super Admin
  const [settings, setSettings] = useState({
    logo: '/uploads/billwave-logo.png',
    logoBg: 'white',
    logoHeight: '56',
    brandTitle: 'BillWave',
    brandSubtitle: 'Manage. Collect. Grow.',
    cardTitleBn: 'স্বাগতম\nলগইন করুন!',
    cardTitleEn: 'Hello\nSign in!',
    cardSubtitleBn: 'আপনার ইউজারনেম, ইমেইল, মোবাইল বা গ্রাহক আইডি লিখুন',
    cardSubtitleEn: 'Enter your Username, Email, Phone, or Customer ID',
    footerText: '© 2026 BillWave. All rights reserved.',
    bgTheme: 'light'
  });

  useEffect(() => {
    api.getLoginSettings()
      .then(data => {
        if (data) setSettings(prev => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(identifier, password);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.message || (isBn ? 'লগইন ব্যর্থ হয়েছে। তথ্য সঠিক কিনা যাচাই করুন।' : 'Login failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'super_admin') navigate('/superadmin');
    else if (role === 'company_admin') navigate('/admin');
    else if (role === 'collector') navigate('/collector');
    else if (role === 'customer') navigate('/customer');
    else navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-white overflow-x-hidden">
      
      {/* Top Header Full-Width with Brand Gradient (Using Logo's Deep Navy & Cyan Waves) */}
      <div className="w-full bg-gradient-to-br from-[#061224] via-[#0b244d] to-[#0284c7] text-white pt-8 sm:pt-12 pb-14 sm:pb-16 px-6 sm:px-10 relative overflow-hidden shrink-0">
        
        {/* Content Container */}
        <div className="max-w-md w-full mx-auto relative z-10">
          
          {/* Logo Badge (clean rounded card for high contrast & sharpness) */}
          {settings.logo ? (
            <div className="mb-4 inline-flex">
              <div className={`p-2.5 rounded-2xl shadow-md transition-all ${
                settings.logoBg === 'slate'
                  ? 'bg-slate-900/80 border border-slate-700 backdrop-blur-md'
                  : settings.logoBg === 'transparent'
                  ? 'bg-transparent'
                  : 'bg-white shadow-black/15 border border-white'
              } inline-flex items-center justify-center max-w-[220px]`}>
                <img 
                  src={getImageUrl(settings.logo)} 
                  alt={settings.brandTitle || 'BillWave'} 
                  style={{ height: `${Math.min(Number(settings.logoHeight) || 56, 60)}px` }}
                  className="w-auto object-contain max-w-[200px]"
                  onError={(e) => {
                    const fallback = getImageUrl('/billwave-logo.png');
                    if (e.target.src !== fallback) {
                      e.target.src = fallback;
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-black text-xl mb-4 shadow-md">
              BW
            </div>
          )}

          {/* Greeting Typography (Like reference image: "Hello \n Sign in!") */}
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {isBn ? 'স্বাগতম' : 'Hello'}
              <br />
              <span className="text-cyan-300 font-black">
                {isBn ? 'লগইন করুন!' : 'Sign in!'}
              </span>
            </h1>
            {settings.brandSubtitle && settings.brandSubtitle !== 'Manage. Collect. Grow.' && (
              <p className="text-xs sm:text-sm text-blue-100/90 mt-1 font-medium">{settings.brandSubtitle}</p>
            )}
          </div>

        </div>

      </div>

      {/* Bottom Sheet Card: Stretches to fill the rest of the entire screen */}
      <div className="w-full flex-1 -mt-6 sm:-mt-8 bg-white rounded-t-[36px] sm:rounded-t-[44px] px-6 sm:px-10 pt-8 pb-10 relative z-20 flex flex-col justify-between shadow-2xs">
        
        {/* Content Container */}
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-between space-y-6">
          
          <div>
            {error && (
              <div className="p-3 mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Field 1: Gmail / Username with Clean Underline */}
              <div>
                <label className="block text-xs font-bold text-[#0c234b] tracking-wide mb-1" htmlFor="login-id">
                  {isBn ? 'ইউজারনেম / ইমেইল / মোবাইল' : 'Gmail / Username / Phone'}
                </label>
                <div className="relative border-b-2 border-slate-200 focus-within:border-cyan-600 transition-colors pb-1">
                  <input
                    id="login-id"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={isBn ? "ইউজারনেম, ইমেইল বা মোবাইল" : "username, email or mobile"}
                    className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 py-2"
                  />
                  {identifier.trim().length >= 3 && (
                    <Check className="w-5 h-5 text-emerald-500 absolute right-1 top-2.5" />
                  )}
                </div>
              </div>

              {/* Field 2: Password with Clean Underline & Eye toggle */}
              <div>
                <label className="block text-xs font-bold text-[#0c234b] tracking-wide mb-1" htmlFor="login-pass">
                  {isBn ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <div className="relative border-b-2 border-slate-200 focus-within:border-cyan-600 transition-colors pb-1">
                  <input
                    id="login-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 py-2 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-1 top-2.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Forgot Password Right-Aligned */}
                <div className="text-right pt-2">
                  <button
                    type="button"
                    onClick={() => alert(isBn ? 'পাসওয়ার্ড রিসেটের জন্য আপনার কোম্পানি এডমিন বা সুপার এডমিনের সাথে যোগাযোগ করুন।' : 'Please contact your Company Admin or Super Admin to reset password.')}
                    className="text-xs font-semibold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                  </button>
                </div>
              </div>

              {/* Pill Button: SIGN IN with User's Brand Gradient */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full font-black text-sm tracking-widest uppercase text-white shadow-xl transition-all cursor-pointer bg-gradient-to-r from-[#071326] via-[#0d2347] to-[#0284c7] hover:from-[#050e1c] hover:to-[#0369a1] shadow-blue-900/30 hover:shadow-cyan-600/30 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isBn ? 'লগইন হচ্ছে...' : 'SIGNING IN...'}</span>
                    </>
                  ) : (
                    <span>{isBn ? 'লগইন করুন' : 'SIGN IN'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Footer Section */}
          <div className="pt-6 space-y-4">
            
            {/* Bottom Signup Prompt & Copyright */}
            <div className="text-center text-xs text-slate-500 font-medium pt-1 space-y-2">
              <div>
                <span>{isBn ? 'নতুন অ্যাকাউন্ট চান? ' : "Don't have account? "}</span>
                <button 
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="font-bold text-[#0c234b] hover:text-cyan-700 cursor-pointer hover:underline transition-colors ml-1"
                >
                  {isBn ? 'সাইন আপ / যোগাযোগ' : 'Sign up / Contact'}
                </button>
              </div>
              
              <div className="text-[10px] text-slate-400 font-mono">
                {settings.footerText || '© 2026 BillWave. All rights reserved.'}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Contact / Signup Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 text-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <MessageCircle className="w-7 h-7" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-2">
              যোগাযোগ করুন ০১৯৮৩১২১৫১২( whatsapp)
            </h3>
            
            <p className="text-xs text-slate-500 mb-6 font-medium">
              {isBn ? 'নতুন কোম্পানি অ্যাকাউন্ট বা রেজিস্ট্রেশনের জন্য হোয়াটসঅ্যাপে বা সরাসরি কল করে যোগাযোগ করুন।' : 'Please contact via WhatsApp or call for new account setup.'}
            </p>

            <div className="space-y-2.5">
              <a 
                href="https://wa.me/8801983121512" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3 rounded-full font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp এ মেসেজ দিন</span>
              </a>
              
              <a 
                href="tel:01983121512" 
                className="w-full py-3 rounded-full font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>কল করুন (০১৯৮৩১২১৫১২)</span>
              </a>

              <button 
                type="button"
                onClick={() => setShowContactModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
