import React from 'react';
import { X, User, Moon, Sun, Shield, LogOut, CheckCircle2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsModal({ isOpen, onClose, user, logout }) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 md:p-8 relative transition-all overflow-hidden ${
          isDark ? 'bg-[#141A30] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit mb-6">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              isDark ? 'bg-[#7965FF]/20 text-[#7965FF]' : 'bg-blue-50 text-blue-600'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 id="settings-title" className="text-base font-bold">Account Preferences</h3>
              <p className="text-xs text-slate-400">Manage display theme and session details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Setting Item 1: Theme Switch */}
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
          }`}>
            <div>
              <p className="text-xs font-bold">Appearance Theme</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Toggle between Light and Dark visual modes
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Setting Item 2: Account Details */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
          }`}>
            <p className="text-xs font-bold">Profile Identity</p>
            <div className="text-xs space-y-1 text-slate-400">
              <div className="flex justify-between py-0.5">
                <span>Name</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.full_name || 'Student'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Email</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Status</span>
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Session
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-inherit flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              isDark 
                ? 'bg-[#7965FF] hover:bg-[#6854EA] text-white shadow-[0_0_15px_rgba(121,101,255,0.3)]'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
