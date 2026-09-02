import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2, Trophy, CheckCircle2, XCircle, Briefcase, ChevronRight, Calculator, AlertTriangle } from 'lucide-react';
import axios from 'axios';

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!compatibility) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-[80vh] flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden max-w-2xl w-full"
        >
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10"></div>
          <Target className="w-20 h-20 text-primary mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4 gradient-text">Job Compatibility Engine</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Evaluate your Unified Competency Profile against predefined industry roles using advanced TF-IDF matching and algorithmic scoring to find your best fit.
          </p>
          
          {error && <p className="text-rose-400 mb-6 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</p>}
          
          <button 
            onClick={handleCalculate}
            disabled={calculating}
            className="bg-primary hover:bg-indigo-600 disabled:bg-primary/50 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 mx-auto text-lg"
          >
            {calculating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
            {calculating ? 'Analyzing & Matching...' : 'Calculate Compatibility'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <Target className="w-10 h-10 text-primary" /> Job Compatibility
          </h1>
          <p className="text-gray-400 mt-2 text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Match results generated successfully.
          </p>
        </div>
        
        <button 
          onClick={handleCalculate}
          disabled={calculating}
          className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {calculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
          {calculating ? 'Recalculating...' : 'Recalculate Compatibility'}
        </button>
      </div>

      {error && <p className="text-rose-400 mb-6 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 max-w-3xl">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Matches Summary */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-3xl border border-primary/30 shadow-[0_0_40px_rgba(79,70,229,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] -z-10"></div>
            
            <div className="flex items-center gap-2 text-primary font-bold tracking-wider uppercase text-sm mb-2">
              <Trophy className="w-5 h-5" /> Best Match
            </div>
            
            <h2 className="text-4xl font-extrabold text-white mb-2">{compatibility.best_role}</h2>
            <div className="text-5xl font-black gradient-text mb-6">{Math.round(compatibility.compatibility_score)}%</div>
            
            <div className="w-full bg-white/5 rounded-full h-3 mb-2 overflow-hidden border border-white/10">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${compatibility.compatibility_score}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-5 text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> All Roles Evaluated</h3>
            <div className="space-y-4">
              {compatibility.matches?.map((match, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-200 font-medium">{match.role}</span>
                    <span className="text-white font-bold">{Math.round(match.score)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${match.role === compatibility.best_role ? 'bg-primary' : 'bg-white/30'}`} 
                      style={{ width: `${match.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Deep Dive */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" /> Recommendation Reasons
            </h3>
            <div className="space-y-3">
              {compatibility.recommendation_reason?.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-gray-200">{reason}</p>
                </div>
              ))}
              {(!compatibility.recommendation_reason || compatibility.recommendation_reason.length === 0) && (
                <p className="text-gray-500 italic">No specific reasons generated.</p>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
              <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Matched Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {compatibility.matched_skills?.map((skill, idx) => (
                  <span key={idx} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {skill}
                  </span>
                ))}
                {(!compatibility.matched_skills || compatibility.matched_skills.length === 0) && (
                  <p className="text-gray-500 italic text-sm">No matched skills found.</p>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
              <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" /> Missing Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {compatibility.missing_skills?.map((item, idx) => {
                  const skillName = typeof item === 'object' ? item.skill : item;
                  const importance = typeof item === 'object' ? item.importance : 'medium';
                  const isHigh = importance === 'high';
                  
                  return (
                    <span 
                      key={idx} 
                      className={`${isHigh ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'} border px-3 py-1 rounded-full text-sm flex items-center gap-1`}
                      title={`Importance: ${importance}`}
                    >
                      {isHigh ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} 
                      {skillName}
                    </span>
                  );
                })}
                {(!compatibility.missing_skills || compatibility.missing_skills.length === 0) && (
                  <p className="text-gray-500 italic text-sm">No missing skills! You're a perfect fit.</p>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
