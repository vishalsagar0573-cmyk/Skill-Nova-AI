import React, { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { InputField, PasswordField, AuthButton } from '../components/auth/AuthComponents';
import SkillNovaLogo from '../components/common/SkillNovaLogo';
import TechHeroIllustration from '../components/common/TechHeroIllustration';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);

  // Restore remembered email on initial mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('skillnova_remember_email');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (rememberMe) {
      localStorage.setItem('skillnova_remember_email', formData.email);
    } else {
      localStorage.removeItem('skillnova_remember_email');
    }
    
    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', formData);
      const { access_token } = res.data;
      
      // Fetch user profile data after getting token
      const userRes = await axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      login(access_token, userRes.data);
      window.location.href = '/'; // Hard redirect to clear out any old state and load authenticated layout
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Invalid email or password. Please verify your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 py-8 lg:py-12 select-none">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center">
        
        {/* =========================================================================
            LEFT COLUMN: BRANDING, HEADLINE, DESCRIPTION & HERO ILLUSTRATION
            ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-center items-start text-left space-y-6">
          {/* Category Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/10 border border-primary/25 text-primary dark:text-blue-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary dark:text-blue-300" />
            <span>AI-Powered Career Platform</span>
          </div>

          {/* Three-Tier Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Build Skills.<br />
            Track Growth.<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Land Opportunities.
            </span>
          </h1>

          {/* Platform Description */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            Your all-in-one platform for skill development, resume analysis, career prediction, and placement readiness.
          </p>

          {/* Technology Laptop Hero Illustration */}
          <div className="w-full pt-2">
            <TechHeroIllustration />
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: AUTHENTICATION CARD
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
            <div className="absolute top-[-25%] right-[-25%] w-56 h-56 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Brand Logo Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <SkillNovaLogo size="lg" />
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                Log in to your account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your credentials to access your dashboard
              </p>
            </div>

            {/* Error Message Banner */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl mb-5 flex items-center gap-3 text-xs leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField 
                label="Email address" 
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
              
              {/* Remember Me & Forgot Password */}
              <div className="flex justify-between items-center py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-primary focus:ring-primary/40 bg-slate-100 dark:bg-white/5 cursor-pointer" 
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordModal(true)}
                  className="text-xs font-semibold text-primary dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <AuthButton type="submit" loading={loading}>
                  Login
                </AuthButton>
              </div>
            </form>

            {/* Sign-Up Switch Link */}
            <p className="text-center text-xs text-slate-600 dark:text-slate-400 mt-6 font-medium">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-bold text-primary dark:text-blue-400 hover:underline underline-offset-4 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>

      </div>

      {/* Forgot Password Helper Modal */}
      {forgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card-bg border border-border-subtle rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-2">Password Reset</h3>
            <p className="text-text-secondary text-xs leading-relaxed mb-6">
              To reset your credentials, please contact your department administrator or email support at <strong className="text-text-main">support@skillnova.ai</strong>.
            </p>
            <button
              onClick={() => setForgotPasswordModal(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
