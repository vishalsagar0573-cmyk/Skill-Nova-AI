import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, Loader2, BrainCircuit, CheckCircle2, ChevronRight, 
  User, Briefcase, Code2, BookOpen, BarChart3, Calculator, 
  RefreshCw, Sparkles, Award, GraduationCap, Layers, ArrowUpRight,
  Search, ShieldCheck, Activity
} from 'lucide-react';
import axios from 'axios';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Tooltip 
} from 'recharts';
import { CircularProgress } from '../components/dashboard/DashboardComponents';

export default function CompetencyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [calcError, setCalcError] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('projects'); // 'projects' | 'experience' | 'education'
  const [pipelineStatus, setPipelineStatus] = useState({
    job_matching: false,
    recommendation: false,
    ml_prediction: false
  });

  useEffect(() => {
    fetchProfile();
    checkPipeline();
  }, []);

  const checkPipeline = async () => {
    try {
      const dashRes = await axios.get('http://localhost:8000/api/dashboard');
      setPipelineStatus(prev => ({
        ...prev,
        job_matching: !!dashRes.data?.job_compatibility,
        recommendation: !!dashRes.data?.recommendations
      }));
    } catch (e) {
      console.error("Dashboard check failed:", e);
    }
    
    try {
      const mlRes = await axios.post('http://localhost:8000/api/ml/predict');
      setPipelineStatus(prev => ({
        ...prev,
        ml_prediction: !!mlRes.data?.predictions || !!mlRes.data?.ml_best_role
      }));
    } catch (e) {
      console.error("ML check failed:", e);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/competency-profile/me');
      if (response.data) {
        setProfile(response.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load competency profile data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8000/api/competency-profile/generate');
      setProfile(response.data);
      checkPipeline();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to synthesize profile. Please ensure you have completed your Student Profile.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCalculateScores = async () => {
    setCalculating(true);
    setCalcError('');
    try {
      const response = await axios.post('http://localhost:8000/api/competency-profile/calculate');
      setProfile(response.data);
    } catch (err) {
      setCalcError(err.response?.data?.detail || 'Failed to calculate competency scores.');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#7965FF] animate-spin" />
        <p className="text-sm font-semibold text-[#929BB2]">Loading Competency Profile...</p>
      </div>
    );
  }

  // Empty State: Profile Not Generated Yet
  if (!profile) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-[85vh] flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass-card p-8 md:p-14 rounded-3xl border border-white/[0.08] shadow-2xl relative overflow-hidden max-w-2xl w-full"
        >
          <div className="absolute top-[-20%] left-[-10%] w-72 h-72 bg-[#7965FF]/20 rounded-full blur-[90px] -z-10" />
          <div className="w-20 h-20 rounded-3xl bg-[#7965FF]/15 border border-[#7965FF]/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(121,101,255,0.25)]">
            <Network className="w-10 h-10 text-[#7965FF]" />
          </div>
          
          <span className="text-xs font-bold uppercase tracking-wider text-[#9B8AFF] bg-[#7965FF]/10 px-3 py-1 rounded-full border border-[#7965FF]/20 inline-block mb-3">
            Multi-Source Aggregation
          </span>

          <h2 className="text-3xl font-extrabold text-[#F5F6FF] mb-3">
            Unified <span className="gradient-text">Competency Profile</span>
          </h2>
          <p className="text-[#929BB2] mb-8 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
            Merge your Student Profile inputs with your parsed resume data. SkillNova AI normalizes skill tokens into a standardized ontology and generates a structured competency map for career matching and XGBoost evaluation.
          </p>
          
          {error && (
            <div className="text-[#F16C83] mb-6 p-4 bg-[#F16C83]/10 rounded-2xl border border-[#F16C83]/20 text-xs md:text-sm">
              {error}
            </div>
          )}
          
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-[#7965FF] to-[#6854EA] hover:from-[#6854EA] hover:to-[#5743D9] disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-xl shadow-[0_0_25px_rgba(121,101,255,0.4)] transition-all flex items-center justify-center gap-2.5 mx-auto text-sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aggregating Multi-Source Data...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                <span>Generate Unified Profile</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  const data = profile.competency_json || {};
  const overallScoreVal = profile.overall_score ?? profile.overall_competency_score;

  // Radar chart data for the core structured competency dimensions
  const radarData = [
    { subject: 'Frontend', score: Math.round(profile.frontend_score || 0) },
    { subject: 'Backend', score: Math.round(profile.backend_score || 0) },
    { subject: 'Database', score: Math.round(profile.database_score || 0) },
    { subject: 'AI/ML', score: Math.round(profile.ai_ml_score || 0) },
    { subject: 'Data Science', score: Math.round(profile.data_science_score || 0) },
    { subject: 'Cloud', score: Math.round(profile.cloud_score || 0) },
    { subject: 'Programming', score: Math.round(profile.programming_score || 0) },
    { subject: 'Soft Skills', score: Math.round(profile.soft_skill_score || 0) },
  ];

  // Competency domain items for progress bars
  const domainScores = [
    { label: "Overall Competency", score: overallScoreVal, color: "bg-[#7965FF]", text: "text-[#7965FF]", expl: profile.score_explanations?.overall_score || "Weighted aggregated competency score across technical and soft skill metrics." },
    { label: "Programming & Core", score: profile.programming_score, color: "bg-[#F16C83]", text: "text-[#F16C83]", expl: profile.score_explanations?.programming_score || "Data structures, algorithms, coding platform scores, and core syntax." },
    { label: "Frontend Engineering", score: profile.frontend_score, color: "bg-sky-500", text: "text-sky-400", expl: profile.score_explanations?.frontend_score || "UI/UX libraries, modern web frameworks, markup, and styling toolchains." },
    { label: "Backend Engineering", score: profile.backend_score, color: "bg-[#42CFA5]", text: "text-[#42CFA5]", expl: profile.score_explanations?.backend_score || "Server architectures, RESTful APIs, microservices, and server-side runtimes." },
    { label: "Database Systems", score: profile.database_score, color: "bg-[#F5B94C]", text: "text-[#F5B94C]", expl: profile.score_explanations?.database_score || "Relational SQL, NoSQL document stores, ORMs, and query optimization." },
    { label: "AI & Machine Learning", score: profile.ai_ml_score, color: "bg-purple-500", text: "text-purple-400", expl: profile.score_explanations?.ai_ml_score || "Supervised/unsupervised models, deep learning, NLP, and model evaluation." },
    { label: "Data Science & Analytics", score: profile.data_science_score, color: "bg-indigo-400", text: "text-indigo-400", expl: profile.score_explanations?.data_science_score || "Data manipulation, statistics, visualization, and exploratory data analysis." },
    { label: "Cloud & DevOps", score: profile.cloud_score, color: "bg-blue-500", text: "text-blue-400", expl: profile.score_explanations?.cloud_score || "Containerization, cloud providers (AWS/GCP), CI/CD, and deployment tools." },
    { label: "Professional Soft Skills", score: profile.soft_skill_score, color: "bg-teal-400", text: "text-teal-400", expl: profile.score_explanations?.soft_skill_score || "Collaboration, technical communication, agile methodologies, and problem solving." },
  ];

  const filteredSkills = (data.skills || []).filter(s => 
    s.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const customTooltipStyle = {
    backgroundColor: '#0D1224',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: '#F5F6FF',
    fontSize: '12px',
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      {/* Header & Global Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7965FF]/10 border border-[#7965FF]/25 text-xs font-semibold text-[#9B8AFF] mb-2">
            <Network className="w-3.5 h-3.5 text-[#7965FF]" />
            <span>Multi-Source Competency Aggregation</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#F5F6FF] flex items-center gap-3">
            Unified <span className="gradient-text">Competency Profile</span>
          </h1>
          <p className="text-[#929BB2] mt-1 text-sm md:text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#42CFA5] shrink-0" /> 
            <span>Merged & normalized from Student Profile inputs and parsed resume signals.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm font-semibold text-[#F5F6FF] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            title="Re-sync data from Student Profile and Resume"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin text-[#9B8AFF]" /> : <RefreshCw className="w-4 h-4 text-[#9B8AFF]" />}
            <span>{generating ? 'Syncing...' : 'Re-sync Data'}</span>
          </button>

          <button 
            onClick={handleCalculateScores}
            disabled={calculating}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7965FF] to-[#6854EA] hover:from-[#6854EA] hover:to-[#5743D9] text-xs md:text-sm font-bold text-white shadow-[0_0_15px_rgba(121,101,255,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            <span>{calculating ? 'Calculating...' : (overallScoreVal != null ? 'Recalculate Scores' : 'Calculate Scores')}</span>
          </button>
        </div>
      </div>

      {calcError && (
        <div className="mb-6 p-4 rounded-xl bg-[#F16C83]/10 border border-[#F16C83]/30 text-xs text-[#F16C83]">
          {calcError}
        </div>
      )}

      {/* Top 3 KPI Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Candidate Meta Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 border border-white/[0.08] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7965FF]/10 rounded-full blur-[50px] -z-10" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 border border-[#7965FF]/25 text-[#7965FF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#929BB2]">Candidate Meta</span>
              <h3 className="text-base font-bold text-[#F5F6FF]">Academic & Career Focus</h3>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <p className="text-xs text-[#929BB2] mb-1 font-medium">Preferred Target Role</p>
              <div className="font-bold text-sm text-[#42CFA5] bg-[#42CFA5]/10 px-3 py-1.5 rounded-xl border border-[#42CFA5]/20 inline-block">
                {data.preferred_job_role || 'General Software Engineering'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                <span className="text-[11px] text-[#929BB2] block font-medium">CGPA Metric</span>
                <span className="text-lg font-extrabold text-[#F5F6FF]">{data.cgpa || 'N/A'}</span>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                <span className="text-[11px] text-[#929BB2] block font-medium">DSA Level</span>
                <span className="text-lg font-extrabold text-[#F5F6FF] capitalize">{data.dsa_level || 'Beginner'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#929BB2]">
              <span>Verified Skills: <strong className="text-[#F5F6FF]">{data.skills?.length || 0}</strong></span>
              <span>Projects: <strong className="text-[#F5F6FF]">{data.projects?.length || 0}</strong></span>
            </div>
          </div>
        </motion.div>

        {/* Overall Competency Score Gauge */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card-ai rounded-3xl p-6 border border-[#7965FF]/25 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#7965FF]/20 border border-[#7965FF]/30 text-[#9B8AFF]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9B8AFF]">Overall Score</span>
                <h3 className="text-base font-bold text-[#F5F6FF]">Unified Competency</h3>
              </div>
            </div>

            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              overallScoreVal != null 
                ? 'bg-[#42CFA5]/15 text-[#42CFA5] border-[#42CFA5]/30' 
                : 'bg-[#F5B94C]/15 text-[#F5B94C] border-[#F5B94C]/30'
            }`}>
              {overallScoreVal != null ? 'Evaluated' : 'Pending'}
            </span>
          </div>

          <div className="my-2 flex justify-center">
            <CircularProgress 
              percentage={overallScoreVal || 0}
              size={120}
              strokeWidth={9}
              color="indigo"
              label="Competency Index"
              subtitle="11-feature baseline"
            />
          </div>

          <p className="text-[11px] text-[#929BB2] leading-relaxed pt-2 border-t border-white/5 text-center">
            {overallScoreVal != null 
              ? 'Derived from multidimensional rubric evaluated across projects, skills, DSA, and academics.' 
              : 'Click "Calculate Scores" above to generate your multidimensional index.'}
          </p>
        </motion.div>

        {/* Pipeline Readiness Card */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl p-6 border border-white/[0.08] relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 text-[#42CFA5]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#929BB2]">Data Integrity</span>
              <h3 className="text-base font-bold text-[#F5F6FF]">Pipeline Pipeline Status</h3>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-[#929BB2]">Student Profile</span>
              <span className="flex items-center gap-1.5 text-[#42CFA5] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-[#929BB2]">Resume Uploaded</span>
              {profile.resume_uploaded ? (
                <span className="flex items-center gap-1.5 text-[#42CFA5] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Present
                </span>
              ) : (
                <span className="text-[#929BB2] italic">Pending</span>
              )}
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-[#929BB2]">Document Parsed</span>
              {profile.resume_parsed ? (
                <span className="flex items-center gap-1.5 text-[#42CFA5] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Extracted
                </span>
              ) : (
                <span className="text-[#929BB2] italic">Pending</span>
              )}
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-[#929BB2]">ML Career Classifier</span>
              {pipelineStatus.ml_prediction ? (
                <span className="flex items-center gap-1.5 text-[#42CFA5] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Inferred
                </span>
              ) : (
                <span className="text-[#929BB2] italic">Pending</span>
              )}
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#929BB2]">TF-IDF Role Matching</span>
              {pipelineStatus.job_matching ? (
                <span className="flex items-center gap-1.5 text-[#42CFA5] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Scored
                </span>
              ) : (
                <span className="text-[#929BB2] italic">Pending</span>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Analytics Section: Radar Chart + Domain Scores Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Radar Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-5 glass-card rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#7965FF]/15 text-[#7965FF]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F6FF]">Competency Radar</h3>
                  <p className="text-xs text-[#929BB2]">Normalized 8-dimension mastery distribution</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#9B8AFF] bg-[#7965FF]/10 border border-[#7965FF]/20 px-2.5 py-0.5 rounded-full">
                Full Spectrum
              </span>
            </div>

            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <defs>
                    <radialGradient id="compRadarGrad">
                      <stop offset="0%" stopColor="#7965FF" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#42CFA5" stopOpacity={0.15} />
                    </radialGradient>
                  </defs>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#929BB2', fontSize: 11, fontWeight: 600 }} 
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar 
                    name="Mastery Score" 
                    dataKey="score" 
                    stroke="#7965FF" 
                    strokeWidth={2} 
                    fill="url(#compRadarGrad)" 
                    dot={{ r: 3, fill: '#9B8AFF', stroke: '#7965FF' }} 
                  />
                  <Tooltip 
                    contentStyle={customTooltipStyle} 
                    formatter={(val) => [`${val}%`, 'Mastery Level']} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#929BB2]">
            <span>Model Dimension: 8 Domains</span>
            <span className="text-[#42CFA5] font-semibold">Normalized Scale (0-100)</span>
          </div>
        </motion.div>

        {/* Detailed Domain Scores List */}
        <motion.div 
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-7 glass-card rounded-3xl p-6 md:p-7 border border-white/[0.08]"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#42CFA5]/15 text-[#42CFA5]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F6FF]">Domain Mastery Breakdown</h3>
                <p className="text-xs text-[#929BB2]">Granular scoring with algorithmic evaluation rationales</p>
              </div>
            </div>
          </div>

          {overallScoreVal != null ? (
            <div className="space-y-4">
              {domainScores.map((item, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-[#F5F6FF] font-semibold flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="font-extrabold text-[#F5F6FF]">
                      {Math.round(item.score || 0)}%
                    </span>
                  </div>

                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mb-1 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score || 0}%` }}
                      transition={{ duration: 1, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>

                  {item.expl && (
                    <p className="text-[11px] text-[#929BB2] leading-tight opacity-75 group-hover:opacity-100 transition-opacity">
                      {item.expl}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/5">
              <p className="text-sm text-[#929BB2] mb-3">Scores have not been calculated yet for this profile.</p>
              <button
                onClick={handleCalculateScores}
                disabled={calculating}
                className="px-5 py-2 rounded-xl bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(121,101,255,0.3)]"
              >
                {calculating ? 'Calculating...' : 'Run Competency Calculation'}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Normalized Skills Cloud */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 border border-[#7965FF]/25 text-[#7965FF]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5F6FF]">Normalized Skills Taxonomy</h3>
              <p className="text-xs text-[#929BB2]">
                Standardized technical and domain skill entities extracted from multi-source inputs ({data.skills?.length || 0} recognized)
              </p>
            </div>
          </div>

          {/* Skill Search Filter */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#929BB2]" />
            <input 
              type="text" 
              placeholder="Search extracted skills..." 
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="glass-input pl-9 pr-4 py-2 text-xs rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filteredSkills.map((skill, idx) => (
            <span 
              key={idx} 
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-[#F5F6FF] text-xs font-medium border border-white/10 hover:border-[#7965FF]/40 hover:bg-[#7965FF]/10 transition-all cursor-default"
            >
              {skill}
            </span>
          ))}
          {filteredSkills.length === 0 && (
            <p className="text-xs text-[#929BB2] italic py-2">
              {skillSearch ? 'No skills matched your filter.' : 'No skills recorded in this profile.'}
            </p>
          )}
        </div>
      </motion.div>

      {/* Multi-Source Evidence Section (Projects, Experience, Education) */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08]"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 text-[#42CFA5]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5F6FF]">Multi-Source Portfolio Evidence</h3>
              <p className="text-xs text-[#929BB2]">Unified projects, professional experiences, and educational credentials</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
            {[
              { id: 'projects', label: 'Projects', count: data.projects?.length || 0 },
              { id: 'experience', label: 'Experience', count: (data.internships?.length || 0) + (data.experience?.length || 0) },
              { id: 'education', label: 'Education & Certs', count: (data.education?.length || 0) + (data.certifications?.length || 0) },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveEvidenceTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeEvidenceTab === tab.id
                    ? 'bg-[#7965FF] text-white shadow-[0_0_12px_rgba(121,101,255,0.3)]'
                    : 'text-[#929BB2] hover:text-[#F5F6FF] hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeEvidenceTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-[#929BB2]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeEvidenceTab === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {data.projects && data.projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.projects.map((proj, idx) => (
                    <div 
                      key={idx}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between"
                    >
                      {typeof proj === 'string' ? (
                        <p className="text-xs text-[#F5F6FF] leading-relaxed">{proj}</p>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-sm text-[#F5F6FF]">{proj.project_name}</h4>
                            <span className="text-[10px] font-semibold text-[#7965FF] bg-[#7965FF]/10 px-2 py-0.5 rounded-md border border-[#7965FF]/20">
                              Verified
                            </span>
                          </div>
                          {proj.technology && (
                            <div className="mb-2">
                              <span className="text-xs text-[#42CFA5] font-medium">{proj.technology}</span>
                            </div>
                          )}
                          <p className="text-xs text-[#929BB2] leading-relaxed">{proj.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#929BB2] italic py-4 text-center">No projects recorded in competency map.</p>
              )}
            </motion.div>
          )}

          {activeEvidenceTab === 'experience' && (
            <motion.div 
              key="experience"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {((data.internships && data.internships.length > 0) || (data.experience && data.experience.length > 0)) ? (
                <div className="space-y-3">
                  {data.internships?.map((intern, idx) => (
                    <div key={`int-${idx}`} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                      {typeof intern === 'string' ? (
                        <p className="text-xs text-[#F5F6FF]"><ChevronRight className="inline w-3.5 h-3.5 text-[#7965FF] mr-1" />{intern}</p>
                      ) : (
                        <div>
                          <div className="flex items-baseline justify-between mb-1">
                            <h4 className="font-bold text-sm text-[#F5F6FF]">{intern.role}</h4>
                            <span className="text-xs text-[#42CFA5] font-semibold">{intern.company}</span>
                          </div>
                          <p className="text-xs text-[#929BB2] leading-relaxed mt-1">{intern.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {data.experience?.map((exp, idx) => (
                    <div key={`exp-${idx}`} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 border-l-4 border-l-[#7965FF]/60">
                      <span className="text-[10px] uppercase font-bold text-[#9B8AFF] tracking-wider block mb-1">From Resume Ingestion</span>
                      <p className="text-xs text-[#F5F6FF] leading-relaxed">{exp}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#929BB2] italic py-4 text-center">No experience or internships recorded.</p>
              )}
            </motion.div>
          )}

          {activeEvidenceTab === 'education' && (
            <motion.div 
              key="education"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Education section */}
              {data.education && data.education.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#929BB2] mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#7965FF]" /> Academic History
                  </h4>
                  <div className="space-y-2">
                    {data.education.map((edu, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#F5F6FF] flex items-center gap-2.5">
                        <GraduationCap className="w-4 h-4 text-[#42CFA5] shrink-0" />
                        <span>{edu}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications section */}
              {data.certifications && data.certifications.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#929BB2] mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#42CFA5]" /> Professional Certifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.certifications.map((cert, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4 text-[#42CFA5]" />
                        </div>
                        <div>
                          {typeof cert === 'string' ? (
                            <p className="text-xs font-semibold text-[#F5F6FF]">{cert}</p>
                          ) : (
                            <>
                              <h5 className="font-bold text-xs text-[#F5F6FF] mb-0.5">{cert.certificate_name}</h5>
                              <p className="text-[11px] text-[#929BB2]">{cert.platform}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                (!data.education || data.education.length === 0) && (
                  <p className="text-xs text-[#929BB2] italic py-4 text-center">No certifications or education recorded.</p>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

