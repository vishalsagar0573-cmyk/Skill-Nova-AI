import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Target, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  ArrowLeft,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import SimpleLearningPath from '../components/learning_path/SimpleLearningPath';
import { useTheme } from '../context/ThemeContext';

export default function LearningPath() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState('Machine Learning Engineer');
  const [readinessScore, setReadinessScore] = useState(0);

  useEffect(() => {
    fetchTargetRole();
  }, []);

  const fetchTargetRole = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/skill-gap/analyze');
      if (res.data) {
        setTargetRole(res.data.target_role || 'Machine Learning Engineer');
        setReadinessScore(res.data.career_readiness_score || 0);
      }
    } catch (err) {
      console.warn('Skill gap endpoint warning:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#7965FF] animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading Personalized Learning Path...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      {/* Header & Global Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Curated Curriculum & Milestone Tracker</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            Personalized <span className="gradient-text">Learning Path</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm md:text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#42CFA5] shrink-0" />
            <span>Targeting <strong className="text-slate-900 dark:text-white font-semibold">{targetRole}</strong> with verified primary & supplementary resources.</span>
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/skill-gap"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-semibold text-slate-800 dark:text-[#F5F6FF] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Skill Gap</span>
          </Link>

          <Link
            to="/career-prediction"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs md:text-sm font-semibold shadow-[0_0_20px_rgba(121,101,255,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Career Prediction</span>
          </Link>
        </div>
      </div>

      {/* Embedded SimpleLearningPath Component */}
      <div className="mb-8">
        <SimpleLearningPath 
          targetRole={targetRole} 
          onProgressUpdated={fetchTargetRole} 
        />
      </div>
    </div>
  );
}
