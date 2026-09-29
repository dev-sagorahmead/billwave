import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Tv, Lock, User, ArrowRight, Shield, Building2, 
  Wallet, Eye, EyeOff, Loader2, Sparkles, CheckCircle2
} from 'lucide-react';

export default function Login() {
  const { login, demoSwitch } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(identifier, password);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role, email) => {
    setError('');
    setLoading(true);
    try {
      const data = await demoSwitch(role, email);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.message || 'Demo login failed');
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      
      {/* Background glowing decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/25">
            <Tv className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            DishBilling <span className="text-blue-400">Cloud</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Mobile-First Cable TV & Dish Network Multi-Tenant Billing Platform
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500">Enter your email, phone, or Customer ID</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="login-id">
                Email / Phone / Customer ID
              </label>
              <div className="relative">
                <input
                  id="login-id"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@dhakasky.com or DSN-000001"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="login-pass">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Badges */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>One-Click Demo Roles:</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin('super_admin')}
                className="p-2 text-left bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg border border-purple-200 font-medium transition-all"
              >
                <div className="font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Super Admin
                </div>
                <div className="text-[10px] text-purple-700">Platform Owner</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('company_admin', 'admin@dhakasky.com')}
                className="p-2 text-left bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-200 font-medium transition-all"
              >
                <div className="font-bold flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Dhaka Sky Admin
                </div>
                <div className="text-[10px] text-blue-700">Company Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('collector', 'kamal@dhakasky.com')}
                className="p-2 text-left bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-200 font-medium transition-all"
              >
                <div className="font-bold flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Kamal (Mirpur)
                </div>
                <div className="text-[10px] text-emerald-700">Bill Collector</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('customer')}
                className="p-2 text-left bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 font-medium transition-all"
              >
                <div className="font-bold flex items-center gap-1">
                  <User className="w-3 h-3" /> Customer Portal
                </div>
                <div className="text-[10px] text-amber-700">DSN-000001</div>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
