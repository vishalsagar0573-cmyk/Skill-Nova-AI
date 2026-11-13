import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Menu, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  UserCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

export default function TopHeader({
  user,
  logout,
  onOpenMobileMenu = () => {},
  onOpenSettings = () => {}
}) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.full_name || 'Student';

  return (
    <header className={`sticky top-0 z-30 h-16 border-b backdrop-blur-xl transition-colors select-none ${
      isDark
        ? 'bg-[#080B18]/85 border-white/10 text-white'
        : 'bg-white/85 border-slate-200 text-slate-800 shadow-sm'
    }`}>
      <div className="h-full px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button + Search Bar */}
        <div className="flex items-center gap-3.5 flex-1 max-w-xl">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl border lg:hidden focus:outline-none focus:ring-2 focus:ring-primary text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Field with Ctrl+K shortcut */}
          <div className="relative w-full hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search for skills, roles, resources..."
              className={`w-full pl-9 pr-14 py-2 rounded-xl text-xs border transition-all outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-[#7965FF] focus:bg-white/10'
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  navigate(`/skill-gap?search=${encodeURIComponent(e.target.value.trim())}`);
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                isDark ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-600'
              }`}>
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Side: Theme Toggle + Notification Bell + User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* Segmented Theme Switcher */}
          <ThemeToggle />

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`p-2 rounded-xl border relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              aria-label="View system notifications"
            >
              <Bell className="w-4 h-4" />
              {/* Unread indicator */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </button>

            {/* Notification Popover */}
            {notificationsOpen && (
              <div className={`absolute right-0 mt-2 w-72 rounded-2xl border p-4 shadow-2xl z-50 animate-fadeIn ${
                isDark ? 'bg-[#141A30] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-inherit">
                  <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">Active</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Platform Ready
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Career intelligence pipelines & ML predictors active.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
              aria-label="User account menu"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#7965FF]/20 text-[#7965FF]' : 'bg-blue-100 text-blue-600'
              }`}>
                <UserCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold max-w-[120px] truncate hidden md:inline-block">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Menu Dropdown */}
            {profileDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-52 rounded-2xl border p-2 shadow-2xl z-50 animate-fadeIn ${
                isDark ? 'bg-[#141A30] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-3 py-2 border-b border-inherit mb-1">
                  <p className="text-xs font-bold truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || 'Logged In'}</p>
                </div>

                <Link
                  to="/student-profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>My Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Preferences</span>
                </button>

                <div className="pt-1 mt-1 border-t border-inherit">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
