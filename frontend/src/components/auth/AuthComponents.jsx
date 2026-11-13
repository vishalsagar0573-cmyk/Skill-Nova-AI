import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export const InputField = ({ label, icon: Icon, type = 'text', required = false, ...props }) => (
  <div className="mb-4">
    {label && (
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <input
        type={type}
        required={required}
        className={`w-full py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-4 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none text-sm font-medium shadow-inner`}
        {...props}
      />
    </div>
  </div>
);

export const PasswordField = ({ label, icon: Icon, required = false, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          type={show ? 'text' : 'password'}
          required={required}
          className={`w-full py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-11 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none text-sm font-medium shadow-inner`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export const AuthButton = ({ children, loading, className = '', ...props }) => (
  <button
    disabled={loading}
    className={`w-full py-3.5 px-4 bg-primary hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-500/25 dark:shadow-indigo-500/30 text-sm ${className}`}
    {...props}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
    {children}
  </button>
);
