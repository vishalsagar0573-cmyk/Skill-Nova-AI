import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { InputField, PasswordField, AuthButton } from '../components/auth/AuthComponents';

// Simple Toast Component
const Toast = ({ message, type }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl border ${
      type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
    }`}
  >
    {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <span className="font-medium">{message}</span>
  </motion.div>
);

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (formData.password !== formData.confirm_password) {
      showToast("Passwords do not match.", "error");
      setLoading(false);
      return;
    }
    
    try {
      await axios.post('http://localhost:8000/api/auth/register', formData);
      showToast("Registration successful", "success");
      setTimeout(() => navigate('/login'), 2000);
    } catch(error) {
      if (error.response) {
        if (error.response.status === 409) {
          showToast("Email already registered.", "error");
        } else if (error.response.status === 422) {
          const detail = error.response.data.detail;
          if (Array.isArray(detail)) {
            showToast(detail[0].msg, "error");
          } else {
            showToast(detail, "error");
          }
        } else {
          showToast("A server error occurred. Please try again later.", "error");
        }
      } else {
        showToast("Network error. Please check your connection.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <AnimatePresence>
        {toast.show && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
        className="glass p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -z-10"></div>
        
        {toast.type === 'success' ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
            <p className="text-gray-400">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-white">Create Account</h2>
            <p className="text-gray-400 mb-8">Join SkillNova AI to accelerate your career.</p>

            <form onSubmit={handleSubmit}>
              <InputField 
                label="Full Name" 
                icon={User} 
                placeholder="John Doe" 
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
              />
              
              <InputField 
                label="Email Address" 
                icon={Mail} 
                type="email" 
                placeholder="you@example.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              
              <PasswordField 
                label="Password" 
                icon={Lock} 
                placeholder="••••••••" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />

              <PasswordField 
                label="Confirm Password" 
                icon={ShieldCheck} 
                placeholder="••••••••" 
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                required
              />
              
              <div className="flex items-center mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" required className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500/50" />
                  <span className="text-sm text-gray-400">I accept the Terms and Privacy Policy</span>
                </label>
              </div>

              <AuthButton type="submit" loading={loading}>Register</AuthButton>
            </form>

            <p className="text-center text-gray-400 mt-6 text-sm">
              Already have an account? <Link to="/login" className="text-white font-bold hover:text-emerald-400 transition-colors">Login</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
