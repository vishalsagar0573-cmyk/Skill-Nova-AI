import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import SkillNovaLogo from '../common/SkillNovaLogo';
import ThemeToggle from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { Menu, X, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

export default function PublicLayout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ open: false, title: '', content: '' });

  const navLinks = [
    { 
      label: 'Features', 
      title: 'Platform Features', 
      desc: 'Unified 10-dimension competency vectors, 8-domain automated scoring, XGBoost AI career prediction, and 5-layer verified resume parsing.' 
    },
    { 
      label: 'How It Works', 
      title: 'How SkillNova AI Works', 
      desc: 'Upload your resume, verify your code repositories and live deployments, benchmark against 14 canonical career roles, and accelerate your placement.' 
    },
    { 
      label: 'Courses', 
      title: 'Curated Resource Catalogue', 
      desc: '120+ peer-reviewed and verified learning resources across 69 technical skills with direct live links to documentation, tutorials, and certifications.' 
    },
    { 
      label: 'Projects', 
      title: 'Evidence-Based Projects', 
      desc: 'Hands-on practical capstones and milestone deliverables evaluated through automated heuristics and departmental mentor reviews.' 
    },
    { 
      label: 'Blog', 
      title: 'Engineering & Research Insights', 
      desc: 'Latest publications on AI-driven educational competency evaluation, XGBoost hyperparameter tuning, and resume NLP entity extraction.' 
    },
  ];

  const handleNavClick = (link) => {
    setInfoModal({ open: true, title: link.title, content: link.desc });
    setMobileNavOpen(false);
  };

  const isLoginActive = location.pathname === '/login';
  const isRegisterActive = location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-text-main transition-colors duration-200 relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div 
        className={`absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-opacity duration-500 ${
          isDark ? 'bg-primary/20' : 'bg-blue-400/15'
        }`} 
      />
      <div 
        className={`absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none transition-opacity duration-500 ${
          isDark ? 'bg-secondary/20' : 'bg-indigo-400/15'
        }`} 
      />

      {/* Top Public Navigation Header (Full Width matching Master Reference) */}
      <header 
        className={`sticky top-0 z-40 h-20 w-full px-6 sm:px-10 lg:px-16 flex items-center justify-between border-b backdrop-blur-xl transition-all ${
          isDark 
            ? 'border-white/10 bg-[#0B0F19]/80 text-white' 
            : 'border-slate-200 bg-white/85 text-slate-800 shadow-sm'
        }`}
      >
        {/* Brand Logo on Left */}
        <div className="flex items-center gap-8">
          <SkillNovaLogo size="md" />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className="text-sm font-semibold text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Controls: Theme Selector + Auth Buttons */}
        <div className="flex items-center gap-3.5">
          {/* Segmented Pill Theme Toggle */}
          <ThemeToggle />

          {/* Login Button */}
          <Link
            to="/login"
            className={`hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isLoginActive
                ? 'bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:text-blue-300 dark:border-primary/40'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Login
          </Link>

          {/* Get Started CTA */}
          <Link
            to="/register"
            className={`hidden sm:inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
              isRegisterActive
                ? 'bg-blue-700 dark:bg-indigo-600 shadow-blue-500/25 ring-2 ring-primary/40'
                : 'bg-primary hover:bg-blue-700 shadow-blue-500/20 active:scale-95'
            }`}
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 lg:hidden text-slate-600 dark:text-slate-300"
            aria-label="Toggle navigation menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 top-20 z-30 bg-app-bg/95 backdrop-blur-2xl lg:hidden flex flex-col p-6 space-y-4 border-b border-border-subtle animate-in fade-in duration-200">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className="w-full text-left px-4 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-border-subtle flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setMobileNavOpen(false)}
              className="w-full py-3 text-center rounded-xl font-bold border border-border-subtle text-text-main"
            >
              Log In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileNavOpen(false)}
              className="w-full py-3 text-center rounded-xl font-bold bg-primary text-white shadow-lg shadow-blue-500/25"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}

      {/* Feature Information Modal */}
      {infoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card-bg border border-border-subtle rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">{infoModal.title}</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">{infoModal.content}</p>
            <button
              onClick={() => setInfoModal({ open: false, title: '', content: '' })}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Full Viewport Content Outlet */}
      <main className="flex-1 w-full flex flex-col z-10 relative">
        <Outlet />
      </main>
    </div>
  );
}
