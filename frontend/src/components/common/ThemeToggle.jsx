import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeToggle Component
 * Renders the segmented pill theme switch matching the master visual reference:
 * [ (Moon) Dark | Light (Sun) ]
 */
export default function ThemeToggle({ size = 'md', className = '' }) {
  const { theme, isDark, setTheme } = useTheme();

  return (
    <div 
      className={`inline-flex items-center p-1 rounded-full border transition-all select-none ${
        isDark 
          ? 'bg-[#12182E] border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.4)]' 
          : 'bg-slate-100 border-slate-200 shadow-sm'
      } ${className}`}
      role="radiogroup"
      aria-label="Color theme selector"
    >
      {/* Dark Option */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isDark
            ? 'bg-[#7965FF] text-white shadow-[0_0_12px_rgba(121,101,255,0.45)]'
            : 'text-slate-400 hover:text-slate-700'
        }`}
        title="Switch to Dark Theme"
      >
        <Moon className={`w-3.5 h-3.5 transition-transform duration-200 ${isDark ? 'scale-110' : ''}`} />
        <span>Dark</span>
      </button>

      {/* Light Option */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          !isDark
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Switch to Light Theme"
      >
        <Sun className={`w-3.5 h-3.5 transition-transform duration-200 ${!isDark ? 'scale-110 text-amber-500' : ''}`} />
        <span>Light</span>
      </button>
    </div>
  );
}
