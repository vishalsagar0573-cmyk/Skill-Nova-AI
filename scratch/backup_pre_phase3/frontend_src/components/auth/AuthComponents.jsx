import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export const InputField = ({ label, icon: Icon, type = 'text', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-500" />
      </div>
      <input
        type={type}
        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all outline-none"
        {...props}
      />
    </div>
  </div>
);

export const PasswordField = ({ label, icon: Icon, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type={show ? 'text' : 'password'}
          className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all outline-none"
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};

export const AuthButton = ({ children, loading, ...props }) => (
  <button
    disabled={loading}
    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-indigo-500/25"
    {...props}
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
    {children}
  </button>
);
