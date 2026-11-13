import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Target, 
  ArrowRight, 
  Award, 
  BarChart3, 
  Cpu, 
  ShieldCheck, 
  Compass,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { CircularProgress } from '../components/dashboard/DashboardComponents';

export default function CareerPrediction() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [competencyProfile, setCompetencyProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrediction();
  }, []);

  const loadPrediction = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch ML prediction
      const mlRes = await axios.post('http://localhost:8000/api/ml/predict');
      setPredictionData(mlRes.data);

      // 2. Fetch competency profile to display the 11 input features
      const compRes = await axios.get('http://localhost:8000/api/competency-profile/me');
      setCompetencyProfile(compRes.data);
    } catch (err) {
      console.error('Error fetching ML prediction:', err);
      setError(
        err.response?.data?.detail || 
        'Could not generate career predictions. Please ensure your Unified Competency Profile has been generated.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReRunPrediction = async () => {
    setPredicting(true);
    setError('');
    try {
      const mlRes = await axios.post('http://localhost:8000/api/ml/predict');
      setPredictionData(mlRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to re-run ML model inference.');
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#7965FF] animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Running XGBoost Career Prediction Pipeline...
        </p>
      </div>
    );
  }

  const predictions = predictionData?.predictions || [];
  const top1 = predictions[0] || null;
  const top2 = predictions[1] || null;
  const top3 = predictions[2] || null;

  // Extract the 11 input features from competency profile
  const scores = competencyProfile?.competency_json?.scores || {};
  const student = competencyProfile?.competency_json || {};

  const inputFeatures = [
    { label: 'CGPA', value: student.cgpa || '0.0', max: 10, unit: '', color: 'bg-emerald-500' },
    { label: 'Frontend Mastery', value: competencyProfile?.frontend_score ?? scores.frontend ?? 0, max: 100, unit: '%', color: 'bg-blue-500' },
    { label: 'Backend Mastery', value: competencyProfile?.backend_score ?? scores.backend ?? 0, max: 100, unit: '%', color: 'bg-indigo-500' },
    { label: 'Database Systems', value: competencyProfile?.database_score ?? scores.database ?? 0, max: 100, unit: '%', color: 'bg-cyan-500' },
    { label: 'AI & ML Mastery', value: competencyProfile?.ai_ml_score ?? scores.ai_ml ?? 0, max: 100, unit: '%', color: 'bg-purple-500' },
    { label: 'Data Science', value: competencyProfile?.data_science_score ?? scores.data_science ?? 0, max: 100, unit: '%', color: 'bg-teal-500' },
    { label: 'Cloud & DevOps', value: competencyProfile?.cloud_score ?? scores.cloud ?? 0, max: 100, unit: '%', color: 'bg-amber-500' },
    { label: 'Programming Core', value: competencyProfile?.programming_score ?? scores.programming ?? 0, max: 100, unit: '%', color: 'bg-rose-500' },
    { label: 'Soft Skills', value: competencyProfile?.soft_skill_score ?? scores.soft_skills ?? 0, max: 100, unit: '%', color: 'bg-violet-500' },
    { label: 'Overall Competency', value: competencyProfile?.overall_competency_score ?? competencyProfile?.overall_score ?? 0, max: 100, unit: '%', color: 'bg-green-500' },
    { label: 'DSA Proficiency', value: student.dsa_level || 'Beginner', isBadge: true, color: 'bg-[#7965FF]' }
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      {/* Header & Global Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7965FF]/10 border border-[#7965FF]/25 text-xs font-semibold text-[#7965FF] dark:text-[#9B8AFF] mb-2">
            <BrainCircuit className="w-3.5 h-3.5 text-[#7965FF]" />
            <span>Machine Learning Career Prediction</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            AI Career <span className="gradient-text">Prediction</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm md:text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#42CFA5] shrink-0" />
            <span>Tuned XGBoost model evaluated from your 11 normalized competency features.</span>
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleReRunPrediction}
            disabled={predicting}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs md:text-sm font-semibold text-slate-800 dark:text-[#F5F6FF] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            title="Re-run prediction through Tuned XGBoost model"
          >
            <RefreshCw className={`w-4 h-4 text-[#7965FF] ${predicting ? 'animate-spin' : ''}`} />
            <span>{predicting ? 'Evaluating Model...' : 'Re-run Prediction'}</span>
          </button>

          <Link
            to="/skill-gap"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs md:text-sm font-semibold shadow-[0_0_20px_rgba(121,101,255,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <Target className="w-4 h-4" />
            <span>View Skill Gap</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Architecture KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Model Architecture</p>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#7965FF]" />
            <span>{predictionData?.model_used || 'Tuned XGBoost'}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Gradient Boosted Trees</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Validation Accuracy</p>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>91.55% CV Score</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">5-Fold Stratified CV</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target Role Space</p>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-500" />
            <span>14 Career Classes</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Balanced Distribution</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Input Feature Vector</p>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span>11 Dimensions</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Normalized & Scaled</p>
        </div>
      </div>

      {/* Main Predictions Grid */}
      {top1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* #1 Top Prediction Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass-card-ai rounded-3xl p-6 md:p-8 border border-indigo-500/30 relative overflow-hidden flex flex-col justify-between"
          >
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[80px] -z-10" />

            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                  <Award className="w-3.5 h-3.5" />
                  <span>🥇 #1 Primary Predicted Career Archetype</span>
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Model Rank #1
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 my-4">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {top1.role}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
                    Based on your multi-source competency profile, your strongest technical synergies match the 
                    <strong className="text-slate-900 dark:text-white font-semibold"> {top1.role} </strong> 
                    industry archetype. The gradient boosted tree ensemble identified exceptional feature density in your core domains.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <CircularProgress
                    percentage={top1.confidence}
                    size={110}
                    strokeWidth={10}
                    color="#7965FF"
                  />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wider">
                    Model Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions for Top Role */}
            <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-[#7965FF]" />
                <span>Highest Softmax probability across all 14 evaluated roles</span>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/job-compatibility"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white transition-all flex items-center gap-1.5"
                >
                  <span>Check Job Matches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/skill-gap"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7965FF] hover:bg-[#6854EA] text-white shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Analyze Skill Gaps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Alternative Predictions Column (#2 & #3) */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* #2 Strong Fit */}
            {top2 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-3xl p-5 border border-slate-200 dark:border-white/10 flex-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      🥈 #2 Strong Alternative
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {top2.confidence}%
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {top2.role}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Strong secondary fit. Your analytical foundations provide immediate lateral mobility towards this career path.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Viable Pivot Option</span>
                  <Link 
                    to="/job-compatibility" 
                    className="text-[#7965FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    Compare <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* #3 Emerging Fit */}
            {top3 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-3xl p-5 border border-slate-200 dark:border-white/10 flex-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                      🥉 #3 Emerging Match
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {top3.confidence}%
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {top3.role}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Tertiary alignment. With targeted bridging electives, you can expand qualification towards this specialized specialization.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Emerging Alignment</span>
                  <Link 
                    to="/skill-gap" 
                    className="text-[#7965FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    View Path <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 11 Input Features Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/10 mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#7965FF]" />
              <span>11 Input Features Fed to the XGBoost Model</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Exact feature vector evaluated by the decision tree ensemble during inference
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-semibold">
            StandardScaler Transformed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inputFeatures.map((feat, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{feat.label}</span>
                {feat.isBadge ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#7965FF]/15 text-[#7965FF] border border-[#7965FF]/30">
                    {feat.value}
                  </span>
                ) : (
                  <span className="font-bold text-slate-900 dark:text-white">
                    {feat.value}{feat.unit}
                  </span>
                )}
              </div>

              {!feat.isBadge && (
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${feat.color}`}
                    style={{ width: `${Math.min(100, (Number(feat.value) / feat.max) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Model Transparency & Viva Defense Note */}
      <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[#7965FF] shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900 dark:text-white block font-bold mb-1">
            Why does Career Prediction differ from Job Compatibility?
          </strong>
          <span>
            <strong>Job Compatibility</strong> evaluates your portfolio (projects and experience descriptions) against specific job role requirements using TF-IDF and Cosine Similarity. 
            In contrast, <strong>AI Career Prediction</strong> uses a multi-class XGBoost machine learning model to evaluate the holistic balance of your entire 11-feature profile across all 8 engineering domains to identify your overall career archetype.
          </span>
        </div>
      </div>
    </div>
  );
}
