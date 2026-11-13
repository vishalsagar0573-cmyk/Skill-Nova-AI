import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, Loader2, Trophy, CheckCircle2, XCircle, Briefcase, 
  ChevronRight, Calculator, AlertTriangle, RefreshCw, Sparkles,
  BarChart3, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { CircularProgress } from '../components/dashboard/DashboardComponents';

export default function JobCompatibility() {
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompatibility();
  }, []);

  const fetchCompatibility = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/job-compatibility/me');
      if (response.data) {
        setCompatibility(response.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load job compatibility data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8000/api/job-compatibility/calculate');
      setCompatibility(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate compatibility. Ensure your Competency Profile is generated first.');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#7965FF] animate-spin" />
        <p className="text-sm font-semibold text-[#929BB2]">Loading Job Compatibility Data...</p>
      </div>
    );
  }

  if (!compatibility) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-[85vh] flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass-card p-8 md:p-14 rounded-3xl border border-white/[0.08] shadow-2xl relative overflow-hidden max-w-2xl w-full"
        >
          <div className="absolute top-[-20%] left-[-10%] w-72 h-72 bg-[#7965FF]/20 rounded-full blur-[90px] -z-10" />
          <div className="w-20 h-20 rounded-3xl bg-[#7965FF]/15 border border-[#7965FF]/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(121,101,255,0.25)]">
            <Target className="w-10 h-10 text-[#7965FF]" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-[#9B8AFF] bg-[#7965FF]/10 px-3 py-1 rounded-full border border-[#7965FF]/20 inline-block mb-3">
            Lexical Similarity Matching
          </span>

          <h2 className="text-3xl font-extrabold text-[#F5F6FF] mb-3">
            Job Compatibility <span className="gradient-text">Engine</span>
          </h2>
          <p className="text-[#929BB2] mb-8 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
            Evaluate your Unified Competency Profile against standard market role requirements using TF-IDF text-based lexical similarity matching with cosine similarity scoring.
          </p>
          
          {error && (
            <div className="text-[#F16C83] mb-6 p-4 bg-[#F16C83]/10 rounded-2xl border border-[#F16C83]/20 text-xs md:text-sm">
              {error}
            </div>
          )}
          
          <button 
            onClick={handleCalculate}
            disabled={calculating}
            className="bg-gradient-to-r from-[#7965FF] to-[#6854EA] hover:from-[#6854EA] hover:to-[#5743D9] disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-xl shadow-[0_0_25px_rgba(121,101,255,0.4)] transition-all flex items-center justify-center gap-2.5 mx-auto text-sm"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running TF-IDF Cosine Matching...</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                <span>Calculate Compatibility</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  const scoreVal = compatibility.compatibility_score || 0;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7965FF]/10 border border-[#7965FF]/25 text-xs font-semibold text-[#9B8AFF] mb-2">
            <Target className="w-3.5 h-3.5 text-[#7965FF]" />
            <span>TF-IDF • Text-Based Lexical Similarity</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#F5F6FF] flex items-center gap-3">
            Job <span className="gradient-text">Compatibility Analysis</span>
          </h1>
          <p className="text-[#929BB2] mt-1 text-sm md:text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#42CFA5] shrink-0" /> 
            <span>Lexical similarity computed against industry standard role competencies.</span>
          </p>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleCalculate}
          disabled={calculating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7965FF] to-[#6854EA] hover:from-[#6854EA] hover:to-[#5743D9] text-white text-xs md:text-sm font-bold shadow-[0_0_20px_rgba(121,101,255,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>{calculating ? 'Recalculating...' : 'Recalculate Compatibility'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#F16C83]/10 border border-[#F16C83]/30 text-xs text-[#F16C83]">
          {error}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Best Match Card & Evaluated Roles */}
        <div className="lg:col-span-5 space-y-6">
          {/* Best Match Card */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-career rounded-3xl p-6 md:p-8 border border-[#42CFA5]/30 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#42CFA5]/10 rounded-full blur-[60px] -z-10" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#42CFA5]/20 text-[#42CFA5] border border-[#42CFA5]/30 text-xs font-bold uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5" /> Best Match
                </span>
                <span className="text-xs font-semibold text-[#929BB2]">Cosine Similarity</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-[#F5F6FF] mb-1">
                {compatibility.best_role}
              </h2>
              <p className="text-xs text-[#929BB2] mb-6">Highest lexical alignment with your normalized competency profile</p>
            </div>

            <div className="flex justify-center my-2">
              <CircularProgress 
                percentage={scoreVal}
                size={140}
                strokeWidth={10}
                color="emerald"
                label="Lexical Match"
                subtitle="TF-IDF Cosine Score"
              />
            </div>

            <div className="pt-4 border-t border-white/5 mt-4 text-center">
              <p className="text-xs text-[#929BB2]">
                Evaluated across technical skill frequencies, keywords, and domain terminology.
              </p>
            </div>
          </motion.div>

          {/* All Evaluated Roles */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-6 border border-white/[0.08]"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#9B8AFF]">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F6FF]">Role Compatibility Rankings</h3>
                <p className="text-xs text-[#929BB2]">Full TF-IDF score comparison across target roles</p>
              </div>
            </div>

            <div className="space-y-4">
              {compatibility.matches?.map((match, idx) => {
                const isTop = match.role === compatibility.best_role;
                return (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={`font-semibold ${isTop ? 'text-[#42CFA5]' : 'text-[#F5F6FF]'}`}>
                        {match.role}
                      </span>
                      <span className="font-bold text-[#F5F6FF]">{Math.round(match.score)}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${match.score}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                        className={`h-full rounded-full ${
                          isTop 
                            ? 'bg-[#42CFA5]' 
                            : 'bg-[#7965FF]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Reasoning, Matched & Missing Skills */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recommendation Reasons */}
          <motion.div 
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08]"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-2xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 text-[#42CFA5]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F5F6FF]">Recommendation Rationale</h3>
                <p className="text-xs text-[#929BB2]">Algorithmic factors driving compatibility with {compatibility.best_role}</p>
              </div>
            </div>

            <div className="space-y-3">
              {compatibility.recommendation_reason?.map((reason, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:border-white/10 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#42CFA5] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#F5F6FF] leading-relaxed">{reason}</p>
                </div>
              ))}
              {(!compatibility.recommendation_reason || compatibility.recommendation_reason.length === 0) && (
                <p className="text-xs text-[#929BB2] italic py-2">No recommendation rationale recorded.</p>
              )}
            </div>
          </motion.div>

          {/* Matched vs Missing Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Skills */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-3xl p-6 border border-white/[0.08]"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 text-[#42CFA5]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F6FF]">Matched Skills</h3>
                  <p className="text-[11px] text-[#929BB2]">Aligned with role prerequisites ({compatibility.matched_skills?.length || 0})</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {compatibility.matched_skills?.map((skill, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1.5 rounded-xl bg-[#42CFA5]/10 text-[#42CFA5] border border-[#42CFA5]/25 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3" /> {skill}
                  </span>
                ))}
                {(!compatibility.matched_skills || compatibility.matched_skills.length === 0) && (
                  <p className="text-xs text-[#929BB2] italic py-2">No matched skills identified.</p>
                )}
              </div>
            </motion.div>

            {/* Missing Skills */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card rounded-3xl p-6 border border-white/[0.08]"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-[#F16C83]/15 border border-[#F16C83]/25 text-[#F16C83]">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F6FF]">Missing Skills</h3>
                  <p className="text-[11px] text-[#929BB2]">Identified gaps for target role ({compatibility.missing_skills?.length || 0})</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {compatibility.missing_skills?.map((item, idx) => {
                  const skillName = typeof item === 'object' ? item.skill : item;
                  const importance = typeof item === 'object' ? item.importance : 'medium';
                  const isHigh = importance === 'high';
                  
                  return (
                    <span 
                      key={idx} 
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                        isHigh 
                          ? 'bg-[#F16C83]/10 text-[#F16C83] border-[#F16C83]/30' 
                          : 'bg-[#F5B94C]/10 text-[#F5B94C] border-[#F5B94C]/30'
                      }`}
                      title={`Importance: ${importance}`}
                    >
                      {isHigh ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} 
                      {skillName}
                    </span>
                  );
                })}
                {(!compatibility.missing_skills || compatibility.missing_skills.length === 0) && (
                  <p className="text-xs text-[#929BB2] italic py-2">No missing skills! Excellent fit.</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}

