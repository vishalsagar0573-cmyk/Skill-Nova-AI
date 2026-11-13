import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Rocket } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { InputField, PasswordField, AuthButton } from '../components/auth/AuthComponents';
import SkillNovaLogo from '../components/common/SkillNovaLogo';
import TechHeroIllustration from '../components/common/TechHeroIllustration';
import { useTheme } from '../context/ThemeContext';

// Floating Toast Notification
const Toast = ({ message, type }) => (
  <motion.div
    initial={{ opacity: 0, y: -40, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -40, scale: 0.95 }}
    className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold backdrop-blur-xl ${
      type === 'success' 
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
        : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
    }`}
  >
    {type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
    <span>{message}</span>
  </motion.div>
);

export default function Register() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    confirm_password: '' 
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      showToast("Passwords do not match. Please verify and retype.", "error");
      return;
    }

    if (!agreeTerms) {
      showToast("Please agree to the Terms of Service to continue.", "error");
      return;
    }

    setLoading(true);
    
    try {
      await axios.post('http://localhost:8000/api/auth/register', formData);
      showToast("Registration successful! Redirecting to login...", "success");
      setTimeout(() => navigate('/login'), 1800);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 409) {
          showToast("Email already registered. Please log in instead.", "error");
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
        showToast("Network error. Please check your connection to the server.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 py-8 lg:py-12 select-none">
      <AnimatePresence>
        {toast.show && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center">
        
        {/* =========================================================================
            LEFT COLUMN: BRANDING, HEADLINE, DESCRIPTION & HERO ILLUSTRATION
            ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-center items-start text-left space-y-6">
          {/* Category Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 shadow-sm">
            <Rocket className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
            <span>Accelerate Your Career Placement</span>
          </div>

          {/* Three-Tier Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Launch Your Career.<br />
            Prove Competencies.<br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 dark:from-emerald-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              Get Hired.
            </span>
          </h1>

          {/* Platform Description */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            Join SkillNova AI to track your domain skills, generate verified project evidence, and match with high-growth engineering roles.
          </p>

          {/* Technology Laptop Hero Illustration */}
          <div className="w-full pt-2">
            <TechHeroIllustration />
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: REGISTRATION CARD
            ========================================================================= */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div 
            className={`w-full max-w-[460px] rounded-3xl p-8 sm:p-10 border transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
              isDark
                ? 'bg-[#10172A]/90 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                : 'bg-white border-slate-200/90 shadow-[0_16px_40px_rgba(37,99,235,0.08)]'
            }`}
          >
            {/* Subtle card top glow */}
            <div className="absolute top-[-25%] right-[-25%] w-56 h-56 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Brand Logo Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <SkillNovaLogo size="lg" />
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                Create your account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Start your AI-driven career journey today
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <InputField 
                label="Full Name" 
                icon={User} 
                placeholder="Aarav Mehta" 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
              
              <InputField 
                label="Email Address" 
                icon={Mail} 
                type="email" 
                placeholder="name@student.skillnova.ai" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              
              <PasswordField 
                label="Password" 
                icon={Lock} 
                placeholder="••••••••" 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />

              <PasswordField 
                label="Confirm Password" 
                icon={ShieldCheck} 
                placeholder="••••••••" 
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
              />
              
              {/* Terms and Privacy Checkbox */}
              <div className="flex items-center gap-2 pt-1 pb-2">
                <input 
                  type="checkbox" 
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-primary focus:ring-primary/40 bg-slate-100 dark:bg-white/5 cursor-pointer" 
                  required
                />
                <label htmlFor="agreeTerms" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  I accept the <span className="font-semibold text-primary dark:text-blue-400 hover:underline">Terms</span> and <span className="font-semibold text-primary dark:text-blue-400 hover:underline">Privacy Policy</span>
                </label>
              </div>

              {/* Submit CTA */}
              <div className="pt-1">
                <AuthButton type="submit" loading={loading}>
                  Create Account
                </AuthButton>
              </div>
            </form>

            {/* Login Switch Link */}
            <p className="text-center text-xs text-slate-600 dark:text-slate-400 mt-6 font-medium">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-bold text-primary dark:text-blue-400 hover:underline underline-offset-4 transition-colors"
              >
                Log in here
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
