import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Megaphone, AlertCircle, X, Info } from 'lucide-react';

export default function MarqueeNoticeBar() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchNotices = async () => {
    if (!user) return;
    try {
      const res = await api.getActiveNotices();
      setNotices(res.notices || []);
    } catch (err) {
      console.error('Error fetching marquee notices:', err);
    }
  };

  useEffect(() => {
    fetchNotices();
    // Poll for new notices every 30 seconds
    const interval = setInterval(fetchNotices, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || notices.length === 0 || isDismissed) {
    return null;
  }

  // Determine highest priority among active notices
  const hasUrgent = notices.some(n => n.priority === 'urgent');
  const hasWarning = notices.some(n => n.priority === 'warning');

  // Gradient themes based on priority
  let bgGradient = 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-800';
  let badgeStyle = 'bg-blue-600 text-white';

  if (hasUrgent) {
    bgGradient = 'bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 text-white border-rose-800';
    badgeStyle = 'bg-rose-600 text-white animate-pulse';
  } else if (hasWarning) {
    bgGradient = 'bg-gradient-to-r from-amber-900 via-orange-900 to-slate-900 text-white border-amber-800';
    badgeStyle = 'bg-amber-600 text-white';
  } else if (user.role === 'collector') {
    bgGradient = 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border-emerald-800';
    badgeStyle = 'bg-emerald-600 text-white';
  }

  const primaryNotice = notices[0];
  const isSuperAdminNotice = primaryNotice.sender_role === 'super_admin';

  return (
    <aside 
      aria-label="Important Announcement"
      className={`relative w-full z-40 border-b shadow-md overflow-hidden ${bgGradient} no-print`}
    >
      <div className="flex items-center justify-between h-9 px-3 gap-2">
        
        {/* Fixed Left Badge: Indicator */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-inherit pr-2 shadow-sm">
          <span className={`flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
            <Megaphone className="w-3 h-3 shrink-0" />
            <span>
              {isSuperAdminNotice ? 'সুপার এডমিন নোটিশ' : 'এডমিন নোটিশ'}
            </span>
          </span>
        </div>

        {/* Center: Smooth Marquee Scroller */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="animate-marquee hover:pause flex items-center gap-12 text-xs font-medium cursor-default">
            {notices.map((n, idx) => (
              <span key={n.id || idx} className="inline-flex items-center gap-2">
                <span className="font-bold text-amber-300">
                  {n.title ? `[${n.title}]` : '★'}
                </span>
                <span>{n.message}</span>
                {idx < notices.length - 1 && (
                  <span className="text-white/40 font-mono mx-4">✦</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Dismiss button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="shrink-0 z-10 p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="নোটিশ বন্ধ করুন"
        >
          <X className="w-3.5 h-3.5" />
        </button>

      </div>
    </aside>
  );
}
