import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Cpu, GraduationCap, Briefcase, Sparkles, TrendingUp } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function TechHeroIllustration() {
  const { isDark } = useTheme();

  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto flex items-center justify-center py-6 select-none">
      {/* Ambient background glow */}
      <div 
        className={`absolute inset-0 rounded-full blur-[90px] pointer-events-none transition-all duration-500 ${
          isDark 
            ? 'bg-gradient-to-tr from-blue-600/25 via-indigo-600/20 to-purple-600/25' 
            : 'bg-gradient-to-tr from-blue-400/20 via-indigo-300/20 to-purple-400/15'
        }`} 
      />

      {/* Floating Badge 1: Top-Left Code </>, floating animation */}
      <motion.div
        animate={{ y: [-6, 6, -6], rotate: [-2, 2, -2] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute -top-1 -left-2 sm:left-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-xl ${
          isDark
            ? 'bg-[#141B32]/90 border-cyan-500/30 text-cyan-300 shadow-cyan-500/10'
            : 'bg-white/95 border-cyan-200 text-cyan-600 shadow-blue-500/10'
        }`}
      >
        <div className="w-7 h-7 rounded-xl bg-cyan-500/15 flex items-center justify-center font-mono font-bold text-sm">
          <Code2 className="w-4 h-4 text-cyan-500" />
        </div>
        <span className="text-xs font-semibold tracking-wide">Clean Code</span>
      </motion.div>

      {/* Floating Badge 2: Top-Right AI Microchip */}
      <motion.div
        animate={{ y: [6, -6, 6], rotate: [1, -2, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className={`absolute -top-3 right-2 sm:right-6 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-xl ${
          isDark
            ? 'bg-[#181534]/90 border-purple-500/30 text-purple-300 shadow-purple-500/10'
            : 'bg-white/95 border-purple-200 text-purple-600 shadow-purple-500/10'
        }`}
      >
        <div className="w-7 h-7 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-purple-500" />
        </div>
        <span className="text-xs font-semibold tracking-wide">AI Scoring</span>
      </motion.div>

      {/* Floating Badge 3: Bottom-Left Graduation Cap */}
      <motion.div
        animate={{ y: [5, -5, 5], rotate: [-1, 2, -1] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className={`absolute -bottom-2 -left-3 sm:left-2 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-xl ${
          isDark
            ? 'bg-[#101F33]/90 border-blue-500/30 text-blue-300 shadow-blue-500/10'
            : 'bg-white/95 border-blue-200 text-blue-600 shadow-blue-500/10'
        }`}
      >
        <div className="w-7 h-7 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-blue-500" />
        </div>
        <span className="text-xs font-semibold tracking-wide">120+ Curated Resources</span>
      </motion.div>

      {/* Floating Badge 4: Bottom-Right Career Matches */}
      <motion.div
        animate={{ y: [-5, 5, -5], rotate: [2, -1, 2] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className={`absolute -bottom-2 -right-3 sm:right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-xl ${
          isDark
            ? 'bg-[#11242F]/90 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
            : 'bg-white/95 border-emerald-200 text-emerald-600 shadow-emerald-500/10'
        }`}
      >
        <div className="w-7 h-7 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-emerald-500" />
        </div>
        <span className="text-xs font-semibold tracking-wide">14 Career Roles</span>
      </motion.div>

      {/* Isometric/Perspective Laptop Device */}
      <div className="relative w-full z-10 flex flex-col items-center">
        {/* Laptop Screen Bezel */}
        <div 
          className={`w-[86%] sm:w-[84%] aspect-[16/10] rounded-2xl sm:rounded-3xl border-2 p-2 sm:p-3 relative transition-all duration-300 shadow-2xl ${
            isDark
              ? 'bg-[#0E1324] border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
              : 'bg-slate-900 border-slate-300 shadow-[0_20px_50px_rgba(37,99,235,0.15)]'
          }`}
        >
          {/* Camera Dot */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-700" />

          {/* Screen Inner Display Area */}
          <div 
            className={`w-full h-full rounded-xl sm:rounded-2xl overflow-hidden p-3 sm:p-4 flex flex-col justify-between border relative ${
              isDark 
                ? 'bg-[#0A0D1B] border-white/5' 
                : 'bg-[#0F172A] border-slate-800'
            }`}
          >
            {/* Top Display Window Controls & Title */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>skillnova.dashboard.live</span>
              </div>
              <div className="w-12 h-2 rounded-full bg-white/10" />
            </div>

            {/* Display Content: Simulated Interactive Dashboard */}
            <div className="grid grid-cols-12 gap-2.5 py-1.5 flex-1 items-center">
              {/* Left Widget: Domain Competency Bars */}
              <div className="col-span-7 bg-white/[0.04] border border-white/10 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-200">Domain Readiness</span>
                  <span className="text-[9px] font-bold text-emerald-400">96% Optimal</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                      <span>Programming</span>
                      <span>92%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-[92%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                      <span>Backend & Database</span>
                      <span>88%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-[88%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                      <span>Cloud & DevOps</span>
                      <span>84%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-[84%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Widget: Radial Career Prediction Meter */}
              <div className="col-span-5 bg-white/[0.04] border border-white/10 rounded-xl p-2.5 flex flex-col items-center justify-center text-center h-full">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-cyan-400 flex items-center justify-center mb-1">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-white leading-tight">Data Engineer</span>
                <span className="text-[8px] text-slate-400">Top Match • 88%</span>
              </div>
            </div>

            {/* Bottom Status Ticker */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>11 XGBoost Features Synchronized</span>
              </span>
              <span className="text-indigo-400 font-semibold">Ready for Review</span>
            </div>
          </div>
        </div>

        {/* Laptop Base & Keyboard Well */}
        <div 
          className={`w-[98%] sm:w-[96%] h-3.5 sm:h-4 rounded-b-xl border-t-0 border transition-all duration-300 relative shadow-xl ${
            isDark
              ? 'bg-gradient-to-b from-slate-700 to-slate-800 border-slate-600/60'
              : 'bg-gradient-to-b from-slate-300 to-slate-400 border-slate-400'
          }`}
        >
          {/* Laptop Base Opening Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-1 sm:h-1.5 rounded-b-md bg-slate-900/40" />
        </div>

        {/* Floor Glow Reflection */}
        <div 
          className={`w-[80%] h-4 -mt-1 rounded-full blur-md ${
            isDark ? 'bg-indigo-500/25' : 'bg-blue-500/20'
          }`}
        />
      </div>
    </div>
  );
}
