import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Award,
  BrainCircuit, 
  Target, 
  Zap, 
  BookOpen, 
  FolderGit2, 
  ShieldCheck, 
  Settings, 
  X,
  UserCircle
} from 'lucide-react';
import SkillNovaLogo from '../common/SkillNovaLogo';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar({
  user,
  mobileOpen = false,
  onClose = () => {},
  onOpenEvidence = () => {},
  onOpenMentorReviews = () => {},
  onOpenSettings = () => {}
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Navigation Items with strict module separation and dedicated routes
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/', type: 'route' },
    { id: 'my-profile', label: 'My Profile', icon: User, to: '/student-profile', type: 'route' },
    { id: 'resume-analysis', label: 'Resume Analysis', icon: FileText, to: '/profile', type: 'route' },
    { id: 'competency-profile', label: 'Unified Competency Profile', icon: Award, to: '/competency-profile', type: 'route' },
    { id: 'career-prediction', label: 'Career Prediction', icon: BrainCircuit, to: '/career-prediction', type: 'route' },
    { id: 'job-matches', label: 'Job Matches', icon: Target, to: '/job-compatibility', type: 'route' },
    { id: 'skill-gap', label: 'Skill Gap', icon: Zap, to: '/skill-gap', type: 'route' },
    { id: 'learning-path', label: 'Learning Path', icon: BookOpen, to: '/learning-path', type: 'route' },
    { id: 'evidence', label: 'Projects & Evidence', icon: FolderGit2, type: 'action', action: onOpenEvidence },
    { id: 'mentor-reviews', label: 'Mentor Reviews', icon: ShieldCheck, type: 'action', action: onOpenMentorReviews },
    { id: 'settings', label: 'Settings', icon: Settings, type: 'action', action: onOpenSettings },
  ];

  const isItemActive = (item) => {
    if (item.type === 'action') return false;
    if (item.to === '/') {
      return location.pathname === '/';
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  };

  const handleItemClick = (item) => {
    if (item.type === 'action' && item.action) {
      item.action();
      onClose();
    } else if (item.to) {
      navigate(item.to);
      onClose();
    }
  };

  const displayName = user?.full_name || 'Student Account';
  const displayRole = user?.role ? user.role.replace('_', ' ') : 'Student';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] flex flex-col border-r transition-transform duration-300 ease-in-out select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isDark
            ? 'bg-[#0B1021] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-inherit">
          <SkillNovaLogo size="md" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (1 through 10) */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? isDark
                      ? 'bg-[#7965FF]/20 text-white border border-[#7965FF]/50 shadow-[0_0_16px_rgba(121,101,255,0.25)] font-bold'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm font-bold'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                  active 
                    ? isDark ? 'text-[#7965FF]' : 'text-blue-600'
                    : isDark ? 'text-slate-400' : 'text-slate-500'
                }`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card at Sidebar Bottom */}
        <div className="p-3.5 border-t border-inherit">
          <div className={`p-2.5 rounded-2xl flex items-center gap-3 transition-colors ${
            isDark ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-[#7965FF]/20 text-[#7965FF]' : 'bg-blue-100 text-blue-600'
            }`}>
              <UserCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate capitalize text-slate-900 dark:text-white">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize font-medium">
                {displayRole}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
