import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  UploadCloud, CheckCircle2, Loader2, Target, TrendingUp, AlertCircle, 
  BookOpen, Sparkles, User, Zap, RefreshCw, Award, ArrowUpRight, 
  ChevronRight, Calendar, Layers, ShieldCheck, Activity, Bell, 
  Check, Info, X, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { uploadResume, getJobMatches, getCourseRecommendations } from '../services/api';
import { 
  DashboardCard, IntelligenceCard, CircularProgress, ChartCard, 
  QuickActionCard, RoadmapTimeline 
} from '../components/dashboard/DashboardComponents';

const customTooltipStyle = {
  backgroundColor: 'rgba(13, 21, 40, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
  padding: '10px 14px',
  color: '#FFFFFF',
  backdropFilter: 'blur(12px)',
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Resume upload modal & processing state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadStep, setUploadStep] = useState('idle'); // 'idle' | 'uploading' | 'analyzing' | 'complete'
  const [uploadError, setUploadError] = useState('');

  // Section 4 active skill filter for recommendations
  const [activeSkillFilter, setActiveSkillFilter] = useState('all');

  // Interactive completed tasks state (stored in session/local state for student engagement)
  const [completedTasks, setCompletedTasks] = useState({});

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setError('');
      const res = await axios.get('http://localhost:8000/api/dashboard');
      if (res.data) {
        setDashboardData(res.data);
      }
      
      // Fetch XGBoost ML prediction
      try {
        const mlRes = await axios.post('http://localhost:8000/api/ml/predict');
        setMlPrediction(mlRes.data);
      } catch (mlErr) {
        // Handled gracefully: user might not have calculated competency scores yet
        console.warn("ML Prediction status:", mlErr?.response?.data?.detail || "Not evaluated yet");
        setMlPrediction(null);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
      setError('Unable to load career intelligence data. Ensure the backend server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.type.includes('pdf')) {
        setUploadError('Please select a PDF document for accurate NLP resume entity extraction.');
        setFile(null);
        return;
      }
      setFile(selected);
      setUploadError('');
    }
  };

  const handleProcessUpload = async () => {
    if (!file) return;
    try {
      setUploadStep('uploading');
      setUploadError('');
      const uploadRes = await uploadResume(file);
      
      setUploadStep('analyzing');
      const matches = await getJobMatches(1);
      
      const missingSkillsSet = new Set();
      if (Array.isArray(matches)) {
        matches.forEach(job => {
          if (Array.isArray(job.missing_skills)) {
            job.missing_skills.forEach(skill => {
              const skillName = typeof skill === 'object' ? skill.skill : skill;
              if (skillName) missingSkillsSet.add(skillName);
            });
          }
        });
      }

      const missingSkillsArray = Array.from(missingSkillsSet);
      if (missingSkillsArray.length > 0) {
        await getCourseRecommendations(missingSkillsArray);
      }

      setUploadStep('complete');
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadStep('idle');
        setFile(null);
        fetchDashboard();
      }, 1200);
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.detail || 'An error occurred during resume NLP processing.');
      setUploadStep('idle');
    }
  };

  const toggleTaskCompletion = (idx) => {
    setCompletedTasks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Helper to remove duplicate task titles e.g. "Complete Complete Django Bootcamp for Django"
  const formatTaskTitle = (taskText) => {
    if (!taskText) return '';
    let cleaned = String(taskText).trim();
    cleaned = cleaned.replace(/^Complete\s+Complete\s+/i, 'Complete ');
    cleaned = cleaned.replace(/^Review\s+Review\s+/i, 'Review ');
    const forMatch = cleaned.match(/^(.*?)\s+for\s+([A-Za-z0-9+#.\s]+)$/i);
    if (forMatch) {
      const [, baseTitle, skillName] = forMatch;
      if (baseTitle.toLowerCase().includes(skillName.trim().toLowerCase())) {
        cleaned = baseTitle.trim();
      }
    }
    return cleaned;
  };

  // Safe data destructuring from verified backend response structure
  const profile = dashboardData?.profile || { name: 'Student', preferred_role: 'Not set', profile_completion: 0 };
  const comp = dashboardData?.competency_scores;
  const job = dashboardData?.job_compatibility;
  const gap = dashboardData?.skill_gap;
  const recommendations = dashboardData?.recommendations || {};
  const actionPlan = dashboardData?.action_plan || [];
  const backendRoadmap = dashboardData?.roadmap || [];
  const systemHealth = dashboardData?.system_health || { status: "Online", services: ["NLP Engine", "ML Scorer", "DB Sync"] };
  const recentActivity = dashboardData?.recent_activity || [];

  // Top 3 XGBoost Predictions sorted descending by actual Model Confidence
  const topXgbPredictions = useMemo(() => {
    if (!mlPrediction?.predictions || !Array.isArray(mlPrediction.predictions)) return [];
    return [...mlPrediction.predictions]
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 3);
  }, [mlPrediction]);

  // 1. Radar Chart Data (6-8 dimensions)
  const radarData = useMemo(() => {
    if (!comp) return [];
    return [
      { subject: 'Frontend', score: Math.round(comp.frontend || 0) },
      { subject: 'Backend', score: Math.round(comp.backend || 0) },
      { subject: 'Database', score: Math.round(comp.database || 0) },
      { subject: 'AI / ML', score: Math.round(comp.ai_ml || 0) },
      { subject: 'Programming', score: Math.round(comp.programming || 0) },
      { subject: 'Soft Skills', score: Math.round(comp.soft_skills || 0) }
    ];
  }, [comp]);

  // 2. Top 5 Job Roles Compatibility Bar Chart Data (TF-IDF Cosine Similarity)
  const topJobMatches = useMemo(() => {
    if (job?.matches && Array.isArray(job.matches) && job.matches.length > 0) {
      return [...job.matches]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map(item => ({
          role: item.role,
          score: Math.round(item.score || 0)
        }));
    }
    if (job?.best_match && job.best_match !== 'None') {
      return [{
        role: job.best_match,
        score: Math.round(job.compatibility_score || 0)
      }];
    }
    return [];
  }, [job]);

  // 3. Skill Gap Breakdown Donut Chart Data (High, Medium, Low)
  const pieData = useMemo(() => {
    if (!gap?.missing_skills_prioritized || !Array.isArray(gap.missing_skills_prioritized) || gap.missing_skills_prioritized.length === 0) {
      return [];
    }
    const counts = { high: 0, medium: 0, low: 0 };
    gap.missing_skills_prioritized.forEach(item => {
      const imp = (item.importance || 'medium').toLowerCase();
      if (counts[imp] !== undefined) counts[imp]++;
      else counts.medium++;
    });

    const colors = { high: '#F43F5E', medium: '#F59E0B', low: '#6366F1' };
    return [
      { name: 'High Priority', key: 'high', value: counts.high, color: colors.high },
      { name: 'Medium Priority', key: 'medium', value: counts.medium, color: colors.medium },
      { name: 'Low Priority', key: 'low', value: counts.low, color: colors.low },
    ].filter(item => item.value > 0);
  }, [gap]);

  const totalMissingCount = gap?.missing_skills_prioritized?.length || 0;

  // 4. Normalized 4-stage Career Roadmap (Sequential Stage Model)
  const careerRoadmapStages = useMemo(() => {
    const defaultStages = [
      {
        stage: 1,
        title: "Foundation and Core Skills",
        description: "Master high-priority missing technical competencies and prerequisite languages.",
        status: totalMissingCount > 0 ? "In Progress" : "Completed"
      },
      {
        stage: 2,
        title: "Advanced Concepts and Tools",
        description: "Deep-dive into preferred architectural tools, cloud infrastructure, and frameworks.",
        status: "Pending"
      },
      {
        stage: 3,
        title: "Practical Projects",
        description: "Build end-to-end portfolio projects and collaborate on active GitHub repositories.",
        status: "Pending"
      },
      {
        stage: 4,
        title: "Job Readiness",
        description: "Benchmark interview performance, refine technical resume, and target role matching.",
        status: "Pending"
      }
    ];

    if (!backendRoadmap || backendRoadmap.length === 0) {
      return defaultStages;
    }

    return defaultStages.map((defStage, idx) => {
      const matched = backendRoadmap[idx];
      return {
        stage: defStage.stage,
        title: defStage.title, // Standardized 4 titles as required
        description: matched?.description || defStage.description,
        status: matched?.status || defStage.status
      };
    });
  }, [backendRoadmap, totalMissingCount]);

  // Filter recommendations based on active skill pill
  const filteredSkillsList = useMemo(() => {
    const keys = Object.keys(recommendations);
    if (activeSkillFilter === 'all') return keys;
    return keys.filter(k => k.toLowerCase() === activeSkillFilter.toLowerCase());
  }, [recommendations, activeSkillFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-6">
        <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Loading Career Intelligence...</h2>
        <p className="text-sm text-slate-400 max-w-sm">Synchronizing Unified Competency Profile, TF-IDF Job Matches & XGBoost Predictions.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:px-8 md:py-8 max-w-7xl space-y-8">
      
      {/* =========================================================================
          SECTION 1: WELCOME & INTELLIGENCE STATUS SECTION
          ========================================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden"
      >
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-50%] left-[-10%] w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Analysis Active
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 hidden sm:inline">AI Engines Synchronized</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="gradient-text">{profile.name || 'Candidate'}</span>
            </h1>

            <div className="pt-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="text-xs font-semibold text-slate-400">Preferred Career Goal:</span>
                <span className="font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-inner">
                  <Target className="w-4 h-4 text-emerald-400" />
                  {profile.preferred_role && profile.preferred_role !== 'Not set' ? profile.preferred_role : 'Target Role Not Specified'}
                </span>
                <Link 
                  to="/student-profile" 
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4 ml-1 transition-colors font-medium"
                >
                  Change goal
                </Link>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2 text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Resume
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="glass hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
              title="Refresh intelligence metrics"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </motion.div>


      {/* =========================================================================
          SECTION 2: CAREER INTELLIGENCE OVERVIEW (4 KEY CARDS)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Career Intelligence Overview
            </h2>
            <p className="text-xs text-slate-400">Core indicators derived from validated backend models and analytical engines</p>
          </div>
        </div>        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Profile Completion */}
          <IntelligenceCard
            title="Profile Completion"
            subtitle="Profile completeness"
            icon={User}
            delay={0.05}
            actionLink="/student-profile"
            actionText="Update Profile"
          >
            <div className="py-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {profile.profile_completion || 0}%
                  </div>
                  <span className="text-xs text-slate-400 font-medium block mt-1">
                    {profile.profile_completion >= 80 ? 'Optimal for evaluation' : 'Additional details recommended'}
                  </span>
                </div>
                <CircularProgress 
                  percentage={profile.profile_completion || 0} 
                  size={68} 
                  strokeWidth={6} 
                  color="blue" 
                />
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Evaluated across personal, academic, project, and skill profile inputs.
              </p>
            </div>
          </IntelligenceCard>

          {/* Card 2: Best Job Description Match (TF-IDF + Cosine Similarity) */}
          <IntelligenceCard
            title="Best Job Description Match"
            subtitle="Textual Similarity"
            icon={Target}
            variant="career"
            delay={0.1}
            algorithmTag="TF-IDF"
            actionLink="/job-compatibility"
            actionText="View Job Matches"
          >
            <div className="py-1">
              {job?.best_match && job.best_match !== 'None' ? (
                <>
                  <div className="text-lg font-bold text-emerald-400 leading-snug mb-1" title={job.best_match}>
                    {job.best_match}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{Math.round(job.compatibility_score || 0)}%</span>
                    <span className="text-xs text-slate-400 font-medium">Textual Similarity</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Resume-to-job description similarity (TF-IDF + Cosine).
                  </p>
                </>
              ) : (
                <div className="py-2">
                  <span className="text-sm font-semibold text-slate-400 block">Not Analyzed</span>
                  <span className="text-xs text-slate-500">Calculate job compatibility to discover matched roles</span>
                </div>
              )}
            </div>
          </IntelligenceCard>

          {/* Card 3: AI Career Prediction (XGBoost) */}
          <IntelligenceCard
            title="AI Career Prediction"
            subtitle="Model Confidence"
            icon={TrendingUp}
            variant="ai"
            delay={0.15}
            algorithmTag="XGBoost"
            actionLink="/competency-profile"
            actionText="View Competencies"
          >
            <div className="py-1">
              {topXgbPredictions.length > 0 ? (
                <div className="space-y-3">
                  {/* #1 Top Prediction */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <span>🥇 #1 Predicted Role</span>
                      </span>
                    </div>
                    <div className="text-lg font-bold text-white leading-snug" title={topXgbPredictions[0].role}>
                      {topXgbPredictions[0].role}
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-indigo-300">
                        {topXgbPredictions[0].confidence}%
                      </span>
                      <span className="text-xs text-indigo-200/80 font-medium">Model Confidence</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Based on 11 competency features.
                    </p>
                  </div>

                  {/* Runner-up predictions (#2 and #3) */}
                  {topXgbPredictions.length > 1 && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Alternative Predictions:
                      </div>
                      <div className="space-y-1.5">
                        {topXgbPredictions.slice(1, 3).map((pred, i) => (
                          <div 
                            key={pred.role || i} 
                            className="flex items-center justify-between gap-2 text-xs bg-white/[0.03] hover:bg-white/[0.05] px-2.5 py-1.5 rounded-xl border border-white/5 transition-colors"
                          >
                            <span className="text-slate-300 font-medium leading-snug" title={pred.role}>
                              {i === 0 ? '🥈 #2' : '🥉 #3'} {pred.role}
                            </span>
                            <span className="text-indigo-300 font-bold text-xs shrink-0 whitespace-nowrap">
                              {pred.confidence}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2">
                  <span className="text-sm font-semibold text-slate-400 block">Pending Evaluation</span>
                  <span className="text-xs text-slate-500">Generate Unified Competency Profile to run XGBoost model</span>
                </div>
              )}
            </div>
          </IntelligenceCard>

          {/* Card 4: Career Readiness */}
          <IntelligenceCard
            title="Career Readiness"
            subtitle="Target Role Evaluation"
            icon={Award}
            variant="career"
            delay={0.2}
            algorithmTag="Readiness Index"
            actionLink="/skill-gap"
            actionText="View Skill Gap"
          >
            <div className="py-1">
              <div className="flex items-center justify-between">
                <div>
                  {gap?.career_readiness_score != null ? (
                    <>
                      <div className="text-3xl font-extrabold text-white tracking-tight">
                        {Math.round(gap.career_readiness_score)}%
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 block mt-1">
                        {gap.career_readiness_score >= 80 ? 'Interview Ready' : gap.career_readiness_score >= 60 ? 'Accelerated Candidate' : gap.career_readiness_score >= 40 ? 'Developing Candidate' : 'Foundational'}
                      </span>
                    </>
                  ) : (
                    <div>
                      <span className="text-sm font-semibold text-slate-400 block">Not Evaluated</span>
                      <span className="text-xs text-slate-500">Pending Skill Gap Analysis</span>
                    </div>
                  )}
                </div>
                <CircularProgress 
                  percentage={gap?.career_readiness_score != null ? Math.round(gap.career_readiness_score) : 0} 
                  size={68} 
                  strokeWidth={6} 
                  color="emerald" 
                />
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Readiness for {profile.preferred_role && profile.preferred_role !== 'Not set' ? profile.preferred_role : 'Target Role'}.
              </p>
            </div>
          </IntelligenceCard>

        </div>
      </section>


      {/* =========================================================================
          SECTION 3: CAREER ANALYTICS (3 CORE CHARTS)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Career Analytics
            </h2>
            <p className="text-xs text-slate-400">Multi-dimensional evaluation of technical competencies, lexical match distribution, and skill gaps</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Chart 1: Competency Radar Chart */}
          <ChartCard
            title="Competency Radar"
            subtitle="Domain mastery scores across 6 core technical pillars"
            icon={Zap}
            delay={0.1}
            headerRight={
              <Link to="/competency-profile" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
                Inspect <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {radarData.length > 0 ? (
              <div className="w-full flex flex-col justify-between h-full">
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <defs>
                      <radialGradient id="radarGrad">
                        <stop offset="0%" stopColor="#818CF8" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.15} />
                      </radialGradient>
                    </defs>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar 
                      name="Domain Mastery" 
                      dataKey="score" 
                      stroke="#818CF8" 
                      strokeWidth={2} 
                      fill="url(#radarGrad)" 
                      dot={{ r: 3, fill: '#A78BFA', stroke: '#818CF8' }} 
                    />
                    <Tooltip 
                      contentStyle={customTooltipStyle} 
                      formatter={(val) => [`${val}/100`, 'Mastery Score']} 
                    />
                  </RadarChart>
                </ResponsiveContainer>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                  <span>Overall Competency:</span>
                  <span className="font-bold text-white bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md text-indigo-300">
                    {Math.round(comp?.overall || 0)} / 100
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Competency profile not generated</p>
                <Link to="/competency-profile" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 font-medium">
                  Calculate Competency Scores &rarr;
                </Link>
              </div>
            )}
          </ChartCard>

          {/* Chart 2: Top 5 Job Roles Compatibility Bar Chart */}
          <ChartCard
            title="Top 5 Job Roles Compatibility"
            subtitle="Text-based lexical similarity (TF-IDF + Cosine)"
            icon={Target}
            delay={0.15}
            headerRight={
              <Link to="/job-compatibility" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {topJobMatches.length > 0 ? (
              <div className="w-full flex flex-col justify-between h-full">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart 
                    data={topJobMatches} 
                    layout="vertical" 
                    margin={{ top: 10, right: 35, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="careerBarGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0D9488" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      dataKey="role" 
                      type="category" 
                      stroke="#94A3B8" 
                      tickLine={false} 
                      axisLine={false} 
                      width={120} 
                      tick={{ fontSize: 11, fill: '#CBD5E1' }} 
                    />
                    <Tooltip 
                      contentStyle={customTooltipStyle} 
                      formatter={(val) => [`${val}%`, 'TF-IDF Compatibility']} 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} 
                    />
                    <Bar 
                      dataKey="score" 
                      fill="url(#careerBarGrad)" 
                      radius={[0, 6, 6, 0]} 
                      barSize={18} 
                      label={{ 
                        position: 'right', 
                        fill: '#34D399', 
                        fontSize: 11, 
                        fontWeight: 700, 
                        formatter: (val) => `${val}%` 
                      }} 
                    />
                  </BarChart>
                </ResponsiveContainer>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                  <span>Best Matched Role:</span>
                  <span className="font-bold text-emerald-300">
                    {topJobMatches[0]?.role || 'N/A'} ({topJobMatches[0]?.score || 0}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No job matches evaluated</p>
                <Link to="/job-compatibility" className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 font-medium">
                  Run Job Compatibility Engine &rarr;
                </Link>
              </div>
            )}
          </ChartCard>

          {/* Chart 3: Skill Gap Breakdown Donut Chart */}
          <ChartCard
            title="Skill Gap Breakdown"
            subtitle="Prioritized missing skills distribution by urgency"
            icon={AlertCircle}
            delay={0.2}
            headerRight={
              <Link to="/skill-gap" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold">
                Details <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {pieData.length > 0 ? (
              <div className="w-full flex flex-col justify-between h-full">
                <div className="relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={75} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(13,21,40,0.8)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center callout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-white">{totalMissingCount}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Gaps</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-center">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="glass p-2 rounded-xl border border-white/5">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] font-semibold text-slate-300">{item.name.replace(' Priority', '')}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No missing skills detected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Your profile meets the target role requirements or analysis has not been calculated yet.
                </p>
                <Link to="/skill-gap" className="text-xs text-emerald-400 hover:text-emerald-300 mt-3 font-medium">
                  Review Skill Gap Analysis &rarr;
                </Link>
              </div>
            )}
          </ChartCard>

        </div>
      </section>


      {/* =========================================================================
          SECTION 4: AI CAREER INSIGHTS
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              AI Career Insights
            </h2>
            <p className="text-xs text-slate-400">Actionable intelligence for bridgeable skill deficits, curated resources, and structured actions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sub-section A: Important Missing Skills */}
          <div className="lg:col-span-1 space-y-4">
            <DashboardCard 
              title="Prioritized Missing Skills" 
              subtitle="Ranked by target role deficit impact"
              icon={AlertCircle}
              variant="default"
              badge={totalMissingCount > 0 ? `${totalMissingCount} Identified` : 'None'}
            >
              {gap?.missing_skills_prioritized && gap.missing_skills_prioritized.length > 0 ? (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {gap.missing_skills_prioritized.map((item, idx) => {
                    const isHigh = item.importance === 'high';
                    const isMedium = item.importance === 'medium';
                    return (
                      <div 
                        key={idx}
                        onClick={() => setActiveSkillFilter(item.skill)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          activeSkillFilter.toLowerCase() === item.skill.toLowerCase()
                            ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                            : 'glass border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : 'bg-indigo-400'
                          }`} />
                          <div>
                            <span className="font-bold text-sm text-white block group-hover:text-indigo-300 transition-colors">
                              {item.skill}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Impact: -{item.points || 10} pts
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isHigh 
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                            : isMedium 
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                              : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}>
                          {item.importance}
                        </span>
                      </div>
                    );
                  })}

                  <div className="pt-2 text-center">
                    <button 
                      onClick={() => setActiveSkillFilter('all')}
                      className="text-xs text-slate-400 hover:text-white transition-colors underline"
                    >
                      Show all recommended resources
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No Critical Gaps Detected</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Your evaluated competency matches or exceeds all baseline criteria for {profile.preferred_role || 'the target role'}.
                  </p>
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Sub-section B: Personalized Improvement Suggestions */}
          <div className="lg:col-span-2 space-y-4">
            <DashboardCard 
              title="Personalized Learning Recommendations" 
              subtitle="Curated courses, verified documentations, and certifications"
              icon={BookOpen}
              variant="default"
              headerRight={
                <Link to="/skill-gap" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
                  Full Catalog &rarr;
                </Link>
              }
            >
              {Object.keys(recommendations).length > 0 ? (
                <div className="space-y-4">
                  {/* Skill filter pills */}
                  <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
                    <button
                      onClick={() => setActiveSkillFilter('all')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
                        activeSkillFilter === 'all'
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                          : 'glass border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Skills ({Object.keys(recommendations).length})
                    </button>
                    {Object.keys(recommendations).map((sk, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSkillFilter(sk)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
                          activeSkillFilter.toLowerCase() === sk.toLowerCase()
                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                            : 'glass border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sk}
                      </button>
                    ))}
                  </div>

                  {/* Resource cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredSkillsList.flatMap(skillKey => 
                      (recommendations[skillKey] || []).map((res, rIdx) => (
                        <a 
                          href={res.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          key={`${skillKey}-${rIdx}`} 
                          className="glass p-4 rounded-2xl hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all flex flex-col justify-between group border border-white/5"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                                {skillKey}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                {res.difficulty || 'All levels'}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors line-clamp-2 mb-1">
                              {res.title}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400 mt-2">
                            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                              {res.provider || 'Resource'}
                            </span>
                            <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px] group-hover:underline">
                              Launch <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No Learning Recommendations Pending</p>
                  <p className="text-xs text-slate-500 mt-1">Run Skill Gap Analysis on your profile to generate targeted resources.</p>
                </div>
              )}
            </DashboardCard>
          </div>

        </div>

        {/* Sub-section C: Recommended Next Actions */}
        <DashboardCard 
          title="Recommended Next Actions" 
          subtitle="Chronological execution plan generated from gap points and resource durations"
          icon={Calendar}
          variant="default"
        >
          {actionPlan.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 px-3 font-semibold">Status</th>
                    <th className="pb-3 px-3 font-semibold">Timeline</th>
                    <th className="pb-3 px-3 font-semibold">Task & Recommended Material</th>
                    <th className="pb-3 px-3 font-semibold">Priority</th>
                    <th className="pb-3 px-3 font-semibold">Est. Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {actionPlan.slice(0, 6).map((plan, idx) => {
                    const isDone = !!completedTasks[idx];
                    const isHigh = plan.priority === 'high';
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-white/[0.02] transition-colors group ${
                          isDone ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleTaskCompletion(idx)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isDone 
                                ? 'bg-emerald-500 border-emerald-400 text-white' 
                                : 'border-white/20 hover:border-white/40'
                            }`}
                            title={isDone ? 'Mark task incomplete' : 'Mark task completed'}
                          >
                            {isDone && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          Week {plan.week}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-slate-200 block ${isDone ? 'line-through text-slate-500' : ''}`}>
                            {formatTaskTitle(plan.task)}
                          </span>
                          {plan.resource_url && (
                            <a 
                              href={plan.resource_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              Open material <ArrowUpRight className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isHigh 
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                              : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {plan.priority || 'medium'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-xs whitespace-nowrap">
                          {plan.estimated_hours ? `${plan.estimated_hours}h` : 'Self-paced'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">
              No immediate actions scheduled. All verified milestones are up to date!
            </div>
          )}
        </DashboardCard>
      </section>


      {/* =========================================================================
          SECTION 5: CAREER ROADMAP (4 SEQUENTIAL STAGES)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Career Roadmap
            </h2>
            <p className="text-xs text-slate-400">Structured progression through the 4 stages of job readiness</p>
          </div>
          <Link to="/skill-gap" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
            Track Roadmap &rarr;
          </Link>
        </div>

        <RoadmapTimeline stages={careerRoadmapStages} />
      </section>


      {/* =========================================================================
          PLATFORM UTILITIES & QUICK ACTIONS DOCK
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="lg:col-span-2">
          <QuickActionCard 
            title="Career Intelligence Navigation" 
            actions={[
              { label: 'Student Profile', to: '/student-profile', icon: User, description: 'Academic records, USN, LeetCode & links' },
              { label: 'Upload Resume', to: '/profile', icon: UploadCloud, description: 'Parse PDF/DOCX for NLP skill extraction' },
              { label: 'Unified Competency', to: '/competency-profile', icon: Activity, description: 'Merged skill vectors and domain mastery' },
              { label: 'Job Compatibility', to: '/job-compatibility', icon: Target, description: 'TF-IDF cosine similarity match evaluation' },
              { label: 'Skill Gap Analysis', to: '/skill-gap', icon: Zap, description: 'Readiness scores, learning catalog & roadmap' }
            ]} 
          />
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* System Health */}
          <DashboardCard title="System Health" icon={ShieldCheck} variant="default">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Platform Status</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {systemHealth.status || 'All Systems Online'}
                </span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-xs text-slate-400 block mb-2">Integrated Micro-Engines:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(systemHealth.services || ["NLP Engine", "ML Scorer", "DB Sync"]).map((svc, i) => (
                    <span key={i} className="text-[11px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
                      {svc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Recent Activity */}
          <DashboardCard title="Recent Activity" icon={Bell} variant="default">
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{act.action}</p>
                      <p className="text-[11px] text-slate-500">{act.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No recent log entries.</p>
              )}
            </div>
          </DashboardCard>
        </div>
      </section>


      {/* =========================================================================
          RESUME UPLOAD / RE-ANALYZE MODAL (Preserves all upload functionality)
          ========================================================================= */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 rounded-3xl max-w-lg w-full border border-white/15 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-400" />
                  NLP Resume Analyzer
                </h3>
                <button 
                  onClick={() => { setUploadModalOpen(false); setUploadStep('idle'); setFile(null); }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadStep === 'idle' && (
                <div>
                  <p className="text-xs text-slate-400 mb-6">
                    Upload your PDF resume. Our NLP pipeline extracts technical skills, projects, and experiences to refresh your Unified Competency vector.
                  </p>

                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors mb-4">
                    <UploadCloud className="w-12 h-12 text-indigo-400 mb-3 opacity-80" />
                    <p className="text-sm font-semibold text-white mb-1">
                      {file ? file.name : 'Select or drop your PDF resume here'}
                    </p>
                    <p className="text-xs text-slate-500 mb-4">Accepts PDF documents up to 10MB</p>

                    <input 
                      type="file" 
                      id="dashboard-modal-upload" 
                      accept=".pdf" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    <label 
                      htmlFor="dashboard-modal-upload" 
                      className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2 rounded-xl text-xs cursor-pointer border border-white/10 transition-colors"
                    >
                      {file ? 'Change File' : 'Browse Computer'}
                    </label>
                  </div>

                  {uploadError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => { setUploadModalOpen(false); setFile(null); }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessUpload}
                      disabled={!file}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    >
                      Process & Analyze
                    </button>
                  </div>
                </div>
              )}

              {(uploadStep === 'uploading' || uploadStep === 'analyzing') && (
                <div className="py-12 flex flex-col items-center text-center">
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                  <h4 className="text-lg font-bold text-white mb-1">
                    {uploadStep === 'uploading' ? 'Extracting NLP Resume Entities...' : 'Computing Multi-Model Compatibility...'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Normalizing skill ontologies and preparing vectors for XGBoost and TF-IDF matching.
                  </p>
                </div>
              )}

              {uploadStep === 'complete' && (
                <div className="py-12 flex flex-col items-center text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4 animate-bounce" />
                  <h4 className="text-lg font-bold text-white mb-1">Analysis Complete!</h4>
                  <p className="text-xs text-slate-400">Dashboard is synchronizing with updated competency scores.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

