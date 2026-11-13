import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrainCircuit, UserCircle, LogOut, Menu, X, LayoutDashboard, User, UploadCloud, Activity, Target, Zap } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Student Profile', to: '/student-profile', icon: User },
    { label: 'Upload Resume', to: '/profile', icon: UploadCloud },
    { label: 'Competency Profile', to: '/competency-profile', icon: Activity },
    { label: 'Job Compatibility', to: '/job-compatibility', icon: Target },
    { label: 'Skill Gap', to: '/skill-gap', icon: Zap },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="glass sticky top-0 z-50 px-4 md:px-8 py-3.5 shadow-xl border-b border-white/[0.08] backdrop-blur-xl">
      <div className="container mx-auto flex justify-between items-center max-w-7xl">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#7965FF]/20 to-[#42CFA5]/10 border border-[#7965FF]/30 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(121,101,255,0.2)]">
            <BrainCircuit className="text-[#7965FF] h-6 w-6" />
          </div>
          <span className="text-xl font-extrabold tracking-wide gradient-text">SkillNova AI</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden xl:flex items-center gap-1.5 text-sm font-medium">
          {user ? (
            <>
              {navLinks.map((link) => {
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3.5 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold ${
                      active
                        ? 'bg-[#7965FF]/15 text-[#F5F6FF] border border-[#7965FF]/40 shadow-[0_0_12px_rgba(121,101,255,0.25)]'
                        : 'text-[#929BB2] hover:text-[#F5F6FF] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* User badge & Logout */}
              <div className="flex items-center gap-3 ml-3 pl-3 border-l border-white/10">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  <UserCircle className="w-4 h-4 text-[#7965FF]" />
                  <span className="text-xs text-[#F5F6FF] font-bold max-w-[120px] truncate">
                    {user.full_name || 'Student'}
                  </span>
                </div>
                <button 
                  onClick={logout}
                  className="flex items-center gap-1.5 bg-[#F16C83]/10 hover:bg-[#F16C83]/20 text-[#F16C83] border border-[#F16C83]/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  title="Sign out of SkillNova AI"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-[#929BB2] hover:text-[#F5F6FF] text-xs font-bold px-4 py-2 transition-colors">
                Login
              </Link>
              <Link to="/register" className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs px-5 py-2 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(121,101,255,0.3)]">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="xl:hidden flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-1.5 text-xs text-[#F5F6FF] font-semibold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 max-w-[110px] truncate">
              <span className="w-2 h-2 rounded-full bg-[#42CFA5]" />
              <span className="truncate">{user.full_name}</span>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl glass border border-white/10 text-[#F5F6FF] hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden mt-3 pt-3 border-t border-white/10 space-y-1.5 animate-fadeIn">
          {user ? (
            <>
              {navLinks.map((link) => {
                const active = isActive(link.to);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-[#7965FF]/20 text-[#F5F6FF] border border-[#7965FF]/40 shadow-[0_0_12px_rgba(121,101,255,0.2)]'
                        : 'text-[#929BB2] hover:text-[#F5F6FF] hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[#7965FF]' : 'text-[#929BB2]'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-[#929BB2]">{user.email || user.full_name}</span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 bg-[#F16C83]/15 text-[#F16C83] px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#F16C83]/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-3 text-center text-[#929BB2] hover:text-[#F5F6FF] text-sm font-semibold rounded-xl bg-white/5"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-3 text-center bg-[#7965FF] text-white text-sm font-bold rounded-xl shadow-[0_0_15px_rgba(121,101,255,0.3)]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

