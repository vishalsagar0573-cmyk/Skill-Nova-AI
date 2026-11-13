import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, TrendingUp, AlertCircle, BookOpen, Clock, Calendar, 
  CheckCircle2, ChevronRight, Activity, Zap, Map, Layers, 
  ExternalLink, Target, RefreshCw, Sparkles, Filter, ShieldCheck,
  AlertTriangle, ArrowUpRight, RotateCcw, Check, Brain, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { CircularProgress } from '../components/dashboard/DashboardComponents';

export default function SkillGap() {
  const [skillGap, setSkillGap] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [gapRes, profileRes] = await Promise.allSettled([
        axios.get('http://localhost:8000/api/skill-gap/me'),
        axios.get('http://localhost:8000/api/student-profile/me')
      ]);

      let profileData = null;
      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        profileData = profileRes.value.data;
        setStudentProfile(profileData);
      }

      let gapData = null;
      if (gapRes.status === 'fulfilled' && gapRes.value?.data) {
        gapData = gapRes.value.data;
      }

      // If gapData is marked stale by the backend (profile role changed), refresh via calculation endpoint cleanly
      if (gapData?.is_stale && profileData?.preferred_job_role) {
        try {
          const syncRes = await axios.post('http://localhost:8000/api/skill-gap/calculate', {
            target_role: profileData.preferred_job_role,
            sync_to_profile: false
          });
          gapData = syncRes.data;
        } catch (syncErr) {
          console.warn("Auto-sync of stale gap data failed:", syncErr);
        }
      }

      setSkillGap(gapData);

      // Fetch XGBoost ML predictions for current logged-in user
      try {
        const mlRes = await axios.post('http://localhost:8000/api/ml/predict');
        if (mlRes.data) {
          setMlPrediction(mlRes.data);
        }
      } catch (mlErr) {
        console.warn("ML Prediction status:", mlErr?.response?.data?.detail || "Not evaluated yet");
        setMlPrediction(null);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load career intelligence data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (targetRoleOverride = null, syncToProfile = false) => {
    setAnalyzing(true);
    setError('');
    try {
      const payload = {};
      if (targetRoleOverride) {
        payload.target_role = targetRoleOverride;
        payload.sync_to_profile = syncToProfile;
      }
      const response = await axios.post('http://localhost:8000/api/skill-gap/calculate', payload);
      setSkillGap(response.data);
      if (syncToProfile && targetRoleOverride) {
        setStudentProfile(prev => prev ? { ...prev, preferred_job_role: targetRoleOverride } : null);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze skill gap. Please ensure your Competency Profile and Job Compatibility analysis are generated first.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#42CFA5] animate-spin" />
        <p className="text-sm font-semibold text-[#929BB2]">Loading Skill Gap Analysis...</p>
      </div>
    );
  }

  // Empty State: Analysis not yet run
  if (!skillGap) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-[85vh] flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass-card p-8 md:p-14 rounded-3xl border border-white/[0.08] shadow-2xl relative overflow-hidden max-w-2xl w-full"
        >
          <div className="absolute top-[-20%] left-[-10%] w-72 h-72 bg-[#42CFA5]/20 rounded-full blur-[90px] -z-10" />
          <div className="w-20 h-20 rounded-3xl bg-[#42CFA5]/15 border border-[#42CFA5]/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(66,207,165,0.25)]">
            <Activity className="w-10 h-10 text-[#42CFA5]" />
          </div>
          
          <span className="text-xs font-bold uppercase tracking-wider text-[#42CFA5] bg-[#42CFA5]/10 px-3 py-1 rounded-full border border-[#42CFA5]/20 inline-block mb-3">
            Target Role Benchmarking
          </span>

          <h2 className="text-3xl font-extrabold text-[#F5F6FF] mb-3">
            Skill Gap <span className="gradient-text">Engine</span>
          </h2>
          <p className="text-[#929BB2] mb-8 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
            Benchmark your unified competencies against industry target requirements. Identify missing prerequisites, compute exact deficiency ratios, and generate an actionable week-by-week learning roadmap.
          </p>
          
          {error && (
            <div className="text-[#F16C83] mb-6 p-4 bg-[#F16C83]/10 rounded-2xl border border-[#F16C83]/20 text-xs md:text-sm">
              {error}
            </div>
          )}
          
          <button 
            onClick={() => handleAnalyze(studentProfile?.preferred_job_role || null, false)}
            disabled={analyzing}
            className="bg-gradient-to-r from-[#42CFA5] to-[#2DD4BF] hover:from-[#38B791] hover:to-[#22B9A6] disabled:opacity-50 text-[#080B18] font-extrabold py-3.5 px-8 rounded-xl shadow-[0_0_25px_rgba(66,207,165,0.4)] transition-all flex items-center justify-center gap-2.5 mx-auto text-sm"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#080B18]" />
                <span>Benchmarking Missing Skills...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 text-[#080B18]" />
                <span>Analyze Skill Gap & Generate Plan</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // Calculate Priority Counts & Total Estimated Hours
  const missingSkills = skillGap.missing_skills_json || [];
  const highPriorityGaps = missingSkills.filter(s => s.importance === 'high');
  const mediumPriorityGaps = missingSkills.filter(s => s.importance === 'medium');
  const lowPriorityGaps = missingSkills.filter(s => s.importance === 'low');

  const actionPlans = skillGap.action_plan_json || [];
  const totalEstHours = actionPlans.reduce((acc, curr) => acc + (Number(curr.estimated_hours) || 0), 0);

  // Grouped resources
  const resourcesMap = skillGap.recommended_resources_json || {};
  const resourceSkillKeys = Object.keys(resourcesMap);

  const activeRole = skillGap.target_role || studentProfile?.preferred_job_role || 'General Software Engineering';
  const profileRole = studentProfile?.preferred_job_role;
  const isDifferentFromProfile = profileRole && activeRole.trim().toLowerCase() !== profileRole.trim().toLowerCase();

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#42CFA5]/10 border border-[#42CFA5]/25 text-xs font-semibold text-[#42CFA5] mb-2">
            <Target className="w-3.5 h-3.5 text-[#42CFA5]" />
            <span>Target Role Benchmark Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#F5F6FF] flex items-center gap-3">
            Skill Gap <span className="gradient-text">& Career Readiness</span>
          </h1>
          
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm md:text-base">
            <span className="text-[#929BB2]">Active Targeting Role:</span>
            <span className="font-bold text-[#F5F6FF] bg-white/5 border border-white/10 px-3 py-0.5 rounded-lg">
              {activeRole}
            </span>

            {/* Profile Preference Reset Action */}
            {isDifferentFromProfile && (
              <div className="flex items-center gap-2 ml-1">
                <span className="text-xs text-[#929BB2]">| Saved Profile Preference:</span>
                <span className="text-xs font-semibold text-[#9B8AFF] bg-[#7965FF]/10 border border-[#7965FF]/20 px-2 py-0.5 rounded-md">
                  {profileRole}
                </span>
                <button
                  onClick={() => handleAnalyze(profileRole, true)}
                  disabled={analyzing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#42CFA5] border border-white/10 transition-colors disabled:opacity-50"
                  title="Reset active target role back to your saved profile preference"
                >
                  <RotateCcw className="w-3 h-3 text-[#42CFA5]" />
                  <span>Reset to Profile Preference</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => handleAnalyze(activeRole, false)}
          disabled={analyzing}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#42CFA5] to-[#2DD4BF] hover:from-[#38B791] hover:to-[#22B9A6] text-[#080B18] text-xs md:text-sm font-extrabold shadow-[0_0_20px_rgba(66,207,165,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin text-[#080B18]" /> : <RefreshCw className="w-4 h-4 text-[#080B18]" />}
          <span>{analyzing ? 'Recalculating Gap...' : 'Recalculate Gap'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#F16C83]/10 border border-[#F16C83]/30 text-xs text-[#F16C83]">
          {error}
        </div>
      )}

      {/* Top 3 Metric Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Career Readiness Score */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-career rounded-3xl p-6 border border-[#42CFA5]/25 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#42CFA5]/20 border border-[#42CFA5]/30 text-[#42CFA5]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#42CFA5]">Preparedness Metric</span>
                <h3 className="text-base font-bold text-[#F5F6FF]">Career Readiness</h3>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#42CFA5]/15 text-[#42CFA5] border border-[#42CFA5]/30">
              Rule-Based
            </span>
          </div>

          <div className="my-2 flex justify-center">
            <CircularProgress 
              percentage={skillGap.career_readiness_score || 0}
              size={120}
              strokeWidth={9}
              color="emerald"
              label="Readiness Index"
              subtitle="Industry threshold"
            />
          </div>

          <p className="text-[11px] text-[#929BB2] leading-relaxed pt-2 border-t border-white/5 text-center">
            Calculated by evaluating normalized competencies against industry baseline requirements for <strong className="text-[#F5F6FF]">{activeRole}</strong>.
          </p>
        </motion.div>

        {/* Card 2: Overall Skill Gap Deficiency */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-3xl p-6 border border-white/[0.08] relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#F16C83]/15 border border-[#F16C83]/25 text-[#F16C83]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#929BB2]">Deficiency Ratio</span>
                <h3 className="text-base font-bold text-[#F5F6FF]">Overall Skill Gap</h3>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F16C83]/15 text-[#F16C83] border border-[#F16C83]/30">
              Deficit
            </span>
          </div>

          <div className="my-2 flex justify-center">
            <CircularProgress 
              percentage={skillGap.overall_gap_percentage || 0}
              size={120}
              strokeWidth={9}
              color="rose"
              label="Competency Gap"
              subtitle="Skills to acquire"
            />
          </div>

          <p className="text-[11px] text-[#929BB2] leading-relaxed pt-2 border-t border-white/5 text-center">
            Proportion of <strong className="text-[#F5F6FF]">{activeRole}</strong> prerequisite skills that require structured learning intervention.
          </p>
        </motion.div>

        {/* Card 3: Priority Gaps & Action Time */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl p-6 border border-white/[0.08] relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 border border-[#7965FF]/25 text-[#7965FF]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#929BB2]">Intervention Effort</span>
              <h3 className="text-base font-bold text-[#F5F6FF]">Learning Distribution</h3>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-[#929BB2] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F16C83]" /> High Priority Blockers
              </span>
              <span className="text-xs font-bold text-[#F16C83]">{highPriorityGaps.length} skills</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-[#929BB2] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F5B94C]" /> Medium Priority Core
              </span>
              <span className="text-xs font-bold text-[#F5B94C]">{mediumPriorityGaps.length} skills</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-[#929BB2] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7965FF]" /> Recommended Electives
              </span>
              <span className="text-xs font-bold text-[#9B8AFF]">{lowPriorityGaps.length} skills</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#929BB2]">
            <span>Estimated Roadmap Commitment:</span>
            <span className="text-[#42CFA5] font-extrabold">{totalEstHours} hours</span>
          </div>
        </motion.div>
      </div>

      {/* XGBoost AI Career Predictions Section */}
      {mlPrediction?.predictions && mlPrediction.predictions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#7965FF]/10 rounded-full blur-[100px] -z-10" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#7965FF]/20 border border-[#7965FF]/30 text-[#9B8AFF]">
                <Brain className="w-5 h-5 text-[#9B8AFF]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#F5F6FF]">AI Career Prediction</h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#7965FF]/20 text-[#9B8AFF] border border-[#7965FF]/30">
                    XGBoost Multiclass Model
                  </span>
                </div>
                <p className="text-xs text-[#929BB2] mt-0.5">
                  Predictions are relative model confidence scores evaluated from your 11 structured competency features (CGPA, DSA Level, and 9 domain mastery scores), not guaranteed probabilities.
                </p>
              </div>
            </div>
            
            <div className="text-[11px] text-[#929BB2] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F5B94C]" />
              <span>Top 3 predicted roles for your candidate profile</span>
            </div>
          </div>

          {/* Top 3 Predicted Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {mlPrediction.predictions.slice(0, 3).map((pred, idx) => {
              const isCurrentActive = activeRole.trim().toLowerCase() === pred.role.trim().toLowerCase();
              const rankLabels = ['🥇 Top Prediction', '🥈 Strong Fit', '🥉 Emerging Fit'];
              const rankColors = [
                'from-[#7965FF]/20 to-[#9B8AFF]/10 border-[#7965FF]/40',
                'from-white/5 to-white/[0.02] border-white/10',
                'from-white/5 to-white/[0.02] border-white/10'
              ];

              return (
                <div
                  key={pred.role}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden bg-gradient-to-b ${rankColors[idx]} ${
                    isCurrentActive ? 'ring-1 ring-[#42CFA5]/50 border-[#42CFA5]/40' : 'hover:border-[#7965FF]/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-[#929BB2]">
                        {rankLabels[idx]}
                      </span>
                      <div className="text-right">
                        <span className="text-base font-black text-[#F5F6FF]">
                          {pred.confidence}%
                        </span>
                        <span className="block text-[9px] text-[#9B8AFF] font-medium leading-none mt-0.5">
                          Model Confidence
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-[#F5F6FF] mb-2 truncate" title={pred.role}>
                      {pred.role}
                    </h4>

                    {/* Confidence Progress Bar */}
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-[#7965FF] to-[#9B8AFF]' 
                            : 'bg-gradient-to-r from-[#42CFA5] to-[#2DD4BF]'
                        }`}
                        style={{ width: `${Math.min(pred.confidence, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    {isCurrentActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#42CFA5] bg-[#42CFA5]/10 px-3 py-1.5 rounded-xl border border-[#42CFA5]/20 w-full justify-center">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Skill Gap Target</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTargetRole(pred.role, true)}
                        disabled={analyzing}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#7965FF] to-[#9B8AFF] hover:from-[#6A54FA] hover:to-[#8A77FF] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Target this Role</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#929BB2]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#42CFA5]" />
              Model: <strong className="text-[#F5F6FF]">{mlPrediction.model_used || 'Tuned XGBoost'}</strong>
              <span className="text-[11px] text-[#929BB2]/80">· Relative confidence across 14 career roles</span>
            </span>
            <span>
              Targeting a predicted role updates your missing skills, career readiness score, and learning roadmap for that objective.
            </span>
          </div>
        </motion.div>
      )}

      {/* Prioritized Missing Skills Badges */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] mb-8"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#F5B94C]/15 border border-[#F5B94C]/25 text-[#F5B94C]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5F6FF]">Prioritized Missing Skills</h3>
              <p className="text-xs text-[#929BB2]">Key competencies required for {skillGap.target_role} categorized by criticality</p>
            </div>
          </div>
          <span className="text-xs text-[#929BB2]">
            Total Gaps: <strong className="text-[#F5F6FF]">{missingSkills.length}</strong>
          </span>
        </div>

        {missingSkills.length > 0 ? (
          <div className="space-y-4">
            {/* High Priority Cluster */}
            {highPriorityGaps.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F16C83] block mb-2">
                  Critical Prerequisite Skills (High Priority)
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {highPriorityGaps.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="px-3.5 py-1.5 rounded-xl bg-[#F16C83]/10 border border-[#F16C83]/30 text-xs font-bold text-[#F16C83] flex items-center gap-2 hover:bg-[#F16C83]/20 transition-all cursor-default"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#F16C83]" />
                      <span>{item.skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medium Priority Cluster */}
            {mediumPriorityGaps.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5B94C] block mb-2">
                  Important Supporting Toolkits (Medium Priority)
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {mediumPriorityGaps.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="px-3.5 py-1.5 rounded-xl bg-[#F5B94C]/10 border border-[#F5B94C]/30 text-xs font-bold text-[#F5B94C] flex items-center gap-2 hover:bg-[#F5B94C]/20 transition-all cursor-default"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#F5B94C]" />
                      <span>{item.skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Priority Cluster */}
            {lowPriorityGaps.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9B8AFF] block mb-2">
                  Recommended Additions (Low Priority)
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {lowPriorityGaps.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="px-3.5 py-1.5 rounded-xl bg-[#7965FF]/10 border border-[#7965FF]/30 text-xs font-bold text-[#9B8AFF] flex items-center gap-2 hover:bg-[#7965FF]/20 transition-all cursor-default"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#9B8AFF]" />
                      <span>{item.skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/5">
            <CheckCircle2 className="w-8 h-8 text-[#42CFA5] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#F5F6FF]">No major skill gaps identified!</p>
            <p className="text-xs text-[#929BB2]">Your unified competency profile fully matches the baseline requirements for {skillGap.target_role}.</p>
          </div>
        )}
      </motion.div>

      {/* Career Roadmap Timeline */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 border border-[#7965FF]/25 text-[#7965FF]">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F5F6FF]">Sequential Career Roadmap</h3>
            <p className="text-xs text-[#929BB2]">Four structured stages from core foundation to interview readiness</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {skillGap.career_roadmap_json?.map((stage, idx) => {
            const isCompleted = stage.status === 'Completed';
            const isInProgress = stage.status === 'In Progress';
            const stageNum = stage.stage || idx + 1;

            return (
              <div 
                key={idx}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isInProgress 
                    ? 'bg-[#7965FF]/15 border-[#7965FF]/40 shadow-[0_0_20px_rgba(121,101,255,0.2)]' 
                    : isCompleted 
                      ? 'bg-[#42CFA5]/10 border-[#42CFA5]/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      isInProgress 
                        ? 'bg-[#7965FF]/20 text-white border-[#7965FF]/40 animate-pulse' 
                        : isCompleted 
                          ? 'bg-[#42CFA5]/20 text-[#42CFA5] border-[#42CFA5]/40' 
                          : 'bg-white/5 text-[#929BB2] border-white/10'
                    }`}>
                      Stage {stageNum}
                    </span>

                    <span className={`text-xs font-bold ${
                      isInProgress ? 'text-[#9B8AFF]' : isCompleted ? 'text-[#42CFA5]' : 'text-[#929BB2]'
                    }`}>
                      {stage.status || 'Pending'}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#F5F6FF] mb-2 leading-snug">
                    {stage.title}
                  </h4>
                  <p className="text-xs text-[#929BB2] leading-relaxed">
                    {stage.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      isInProgress ? 'bg-[#7965FF] animate-ping' : isCompleted ? 'bg-[#42CFA5]' : 'bg-slate-600'
                    }`} />
                    <span className="text-[10px] text-[#929BB2] uppercase tracking-wider font-semibold">
                      {isCompleted ? 'Achieved' : isInProgress ? 'Active Focus' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Structured Action Plan Table */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 text-[#42CFA5]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5F6FF]">Structured Action Plan</h3>
              <p className="text-xs text-[#929BB2]">Milestone schedule with verified hours and study tasks</p>
            </div>
          </div>
          <span className="text-xs text-[#929BB2]">
            Total Commitment: <strong className="text-[#42CFA5]">{totalEstHours} Hours</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#929BB2] text-xs uppercase tracking-wider font-semibold">
                <th className="pb-3.5 px-4">Timeline</th>
                <th className="pb-3.5 px-4">Task & Objective</th>
                <th className="pb-3.5 px-4">Priority</th>
                <th className="pb-3.5 px-4">Est. Hours</th>
                <th className="pb-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {actionPlans.map((plan, idx) => (
                <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-4 px-4 font-bold text-[#F5F6FF] whitespace-nowrap">
                    Week {plan.week}
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-[#F5F6FF] mb-0.5">{plan.task}</p>
                    {plan.resource_url && (
                      <a 
                        href={plan.resource_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[11px] text-[#9B8AFF] hover:text-[#7965FF] inline-flex items-center gap-1 transition-colors"
                      >
                        Launch Direct Learning Link <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                      plan.priority === 'high' 
                        ? 'bg-[#F16C83]/15 text-[#F16C83] border-[#F16C83]/30' 
                        : plan.priority === 'medium' 
                          ? 'bg-[#F5B94C]/15 text-[#F5B94C] border-[#F5B94C]/30' 
                          : 'bg-[#7965FF]/15 text-[#9B8AFF] border-[#7965FF]/30'
                    }`}>
                      {plan.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-[#929BB2] font-semibold whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#929BB2]" /> {plan.estimated_hours}h
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    {plan.resource_url ? (
                      <a 
                        href={plan.resource_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#F5F6FF] inline-flex items-center gap-1 transition-colors"
                        title="Open Resource"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[#929BB2]">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {actionPlans.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[#929BB2] italic">
                    No action plan required. You're already well prepared for this role!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Curated Recommended Learning Resources */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 border border-[#7965FF]/25 text-[#7965FF]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5F6FF]">Curated Learning Resources</h3>
              <p className="text-xs text-[#929BB2]">Verified courseware and documentations aligned with missing competencies</p>
            </div>
          </div>

          {/* Skill Filter Pills */}
          {resourceSkillKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedSkillFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedSkillFilter === 'all'
                    ? 'bg-[#7965FF] text-white shadow-[0_0_12px_rgba(121,101,255,0.3)]'
                    : 'text-[#929BB2] hover:text-[#F5F6FF] bg-white/5'
                }`}
              >
                All Skills
              </button>
              {resourceSkillKeys.map((skill) => (
                <button
                  key={skill}
                  onClick={() => setSelectedSkillFilter(skill)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedSkillFilter === skill
                      ? 'bg-[#7965FF] text-white shadow-[0_0_12px_rgba(121,101,255,0.3)]'
                      : 'text-[#929BB2] hover:text-[#F5F6FF] bg-white/5'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resources Grid */}
        <div className="space-y-6">
          {Object.entries(resourcesMap)
            .filter(([skill]) => selectedSkillFilter === 'all' || selectedSkillFilter === skill)
            .map(([skill, resources], sIdx) => (
              <div key={sIdx} className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-sm font-bold text-[#F5F6FF] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#42CFA5]" />
                    Skill Focus: <span className="text-[#42CFA5]">{skill}</span>
                  </h4>
                  <span className="text-xs text-[#929BB2]">{resources.length} verified paths</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((res, rIdx) => (
                    <a 
                      href={res.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      key={rIdx} 
                      className="block group"
                    >
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#7965FF]/40 hover:bg-[#7965FF]/5 transition-all h-full flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#7965FF]/10 rounded-bl-full -z-10 group-hover:scale-125 transition-transform" />

                        <div>
                          <div className="flex justify-between items-center mb-2.5">
                            <span className="text-[10px] font-bold text-[#9B8AFF] bg-[#7965FF]/15 px-2 py-0.5 rounded-md border border-[#7965FF]/30">
                              {res.type || 'Course'}
                            </span>
                            <span className="text-[11px] text-[#929BB2] font-medium">
                              {res.difficulty || 'All Levels'}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-[#F5F6FF] group-hover:text-[#42CFA5] transition-colors mb-2 line-clamp-2">
                            {res.title}
                          </h5>

                          <p className="text-xs text-[#929BB2] line-clamp-2 leading-relaxed mb-4">
                            {res.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#929BB2]">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#929BB2]" />
                            <strong className="text-[#F5F6FF] font-medium">{res.provider || 'Platform'}</strong>
                          </span>

                          <span className="text-[#42CFA5] font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {res.duration}h
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}

          {resourceSkillKeys.length === 0 && (
            <p className="text-xs text-[#929BB2] italic text-center py-6">
              No specific resources required. You are ready for your target role!
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

