import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Circle, Clock, ExternalLink, ChevronDown, ChevronUp, 
  Layers, Sparkles, BookOpen, FileText, Globe, GraduationCap, 
  Play, RotateCcw, Award, Check, AlertCircle, ArrowUpRight, FolderGit2,
  Shield
} from 'lucide-react';
import { getLearningPath, updateStepProgress, updateCapstoneStatus } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import EvidenceDrawer, { EvidenceBadge } from './EvidenceDrawer';
import MentorReviewQueue from './MentorReviewQueue';

export default function SimpleLearningPath({ targetRole, onProgressUpdated }) {
  const { user } = useContext(AuthContext) || {};
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [expandedAlternatives, setExpandedAlternatives] = useState({});
  const [selectedEvidenceItem, setSelectedEvidenceItem] = useState(null);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState(false);
  const [isReviewQueueOpen, setIsReviewQueueOpen] = useState(false);

  const isMentorUser = Boolean(
    user?.email && (
      user.email === 'admin@skillnova.ai' ||
      user.email.toLowerCase().includes('mentor') ||
      user.email.toLowerCase().includes('faculty') ||
      user.email.toLowerCase().includes('admin')
    )
  );

  useEffect(() => {
    loadLearningPath();
  }, [targetRole]);

  const loadLearningPath = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLearningPath();
      setLearningPath(data);
    } catch (err) {
      console.error('Failed to load learning path:', err);
      setError('Unable to load learning path. Please ensure your Skill Gap analysis is calculated.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlternative = (skill) => {
    setExpandedAlternatives(prev => ({
      ...prev,
      [skill]: !prev[skill]
    }));
  };

  const handleStepStatusChange = async (step, newStatus, resourceIdOverride = null) => {
    const targetResourceId = resourceIdOverride || step.primary_resource?.id;
    if (!targetResourceId) return;

    setUpdatingId(targetResourceId);
    setError('');

    // Optimistic state snapshot for rollback
    const prevPath = learningPath;

    try {
      // Optimistic update
      setLearningPath(current => {
        if (!current) return current;
        const newStages = current.stages.map(stage => ({
          ...stage,
          steps: stage.steps.map(s => {
            if (s.skill === step.skill) {
              const updatedStatus = newStatus;
              let isStepCompleted = updatedStatus === 'Completed';
              let isStepInProgress = updatedStatus === 'In Progress';
              return {
                ...s,
                step_status: updatedStatus,
                is_completed: isStepCompleted,
                is_in_progress: isStepInProgress,
                primary_resource: s.primary_resource ? {
                  ...s.primary_resource,
                  status: (s.primary_resource.id === targetResourceId) ? newStatus : s.primary_resource.status
                } : null,
                supplementary_resources: (s.supplementary_resources || []).map(sup => (
                  sup.id === targetResourceId ? { ...sup, status: newStatus } : sup
                ))
              };
            }
            return s;
          })
        }));

        // Recalculate completed count
        let completed = 0;
        let inProg = 0;
        let total = current.total_steps || 1;
        newStages.forEach(st => {
          st.steps.forEach(stStep => {
            if (stStep.is_completed) completed += 1;
            else if (stStep.is_in_progress) inProg += 1;
          });
        });

        const progressPct = total > 0 
          ? Math.min(100.0, Math.round(((completed + 0.5 * inProg) / total) * 1000) / 10) 
          : 100.0;

        return {
          ...current,
          completed_steps: completed,
          in_progress_steps: inProg,
          path_progress_percentage: progressPct,
          stages: newStages
        };
      });

      // API Call
      const res = await updateStepProgress(targetResourceId, newStatus);
      if (res) {
        setLearningPath(res);
        if (onProgressUpdated) onProgressUpdated(res);
      }
    } catch (err) {
      console.error('Error updating step progress:', err);
      setError(err?.response?.data?.detail || 'Failed to update progress.');
      // Rollback
      setLearningPath(prevPath);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCapstoneStatusChange = async (newStatus) => {
    setUpdatingId('capstone');
    setError('');

    const prevPath = learningPath;

    try {
      setLearningPath(current => {
        if (!current || !current.capstone_project) return current;
        return {
          ...current,
          capstone_project: {
            ...current.capstone_project,
            status: newStatus
          }
        };
      });

      const res = await updateCapstoneStatus(newStatus);
      if (res) {
        setLearningPath(res);
        if (onProgressUpdated) onProgressUpdated(res);
      }
    } catch (err) {
      console.error('Error updating capstone status:', err);
      setError(err?.response?.data?.detail || 'Failed to update capstone status.');
      setLearningPath(prevPath);
    } finally {
      setUpdatingId(null);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Course':
        return <GraduationCap className="w-3.5 h-3.5 text-[#7965FF]" />;
      case 'Documentation':
        return <FileText className="w-3.5 h-3.5 text-[#42CFA5]" />;
      case 'Platform':
        return <Globe className="w-3.5 h-3.5 text-[#F5B94C]" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-[#9B8AFF]" />;
    }
  };

  const getDifficultyBadge = (difficulty) => {
    const diff = (difficulty || 'Beginner').toLowerCase();
    if (diff === 'beginner') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (diff === 'intermediate') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8 border border-white/[0.08] flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="w-10 h-10 border-4 border-[#7965FF]/20 border-t-[#7965FF] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Generating Your Simple Learning Path...</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Sequencing verified resources and practical milestones</p>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="glass-card rounded-3xl p-8 border border-white/[0.08] text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-900 dark:text-white">No Learning Path Generated</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
          Please run a Skill Gap analysis first to identify missing competencies for {targetRole || 'your chosen role'}.
        </p>
      </div>
    );
  }

  const {
    target_role,
    total_steps,
    completed_steps,
    in_progress_steps,
    path_progress_percentage,
    total_estimated_hours,
    stages = [],
    capstone_project,
    is_role_ready
  } = learningPath;

  return (
    <div className="space-y-6">
      {/* Header Metric & Progress Summary */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#7965FF]/10 to-[#42CFA5]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#7965FF]/15 text-[#9B8AFF] border border-[#7965FF]/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#7965FF]" />
                {target_role}
              </span>
              {is_role_ready ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#42CFA5]/15 text-[#42CFA5] border border-[#42CFA5]/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Role Ready
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-slate-600 dark:text-slate-400 border border-white/10">
                  {total_steps - completed_steps} Remaining Step{total_steps - completed_steps !== 1 ? 's' : ''}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-600 dark:text-slate-400 border border-white/10 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#42CFA5]" />
                {total_estimated_hours}h Curated Material
              </span>
              {isMentorUser && (
                <button
                  onClick={() => setIsReviewQueueOpen(true)}
                  className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#7965FF]/20 hover:bg-[#7965FF]/30 text-white border border-[#7965FF]/40 flex items-center gap-1.5 transition-all shadow-sm"
                  title="Open Mentor Evidence Review Queue"
                >
                  <Shield className="w-3.5 h-3.5 text-[#9B8AFF]" />
                  <span>Mentor Review Queue</span>
                </button>
              )}
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Interactive Simple Learning Path
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              A sequenced, step-by-step roadmap from core prerequisites to hands-on capstone execution. 
              Each required step is fulfilled by completing its primary resource or any verified alternative.
            </p>
          </div>

          {/* Path Completion Gauge */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 min-w-[280px]">
            <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#42CFA5] transition-all duration-700 ease-out"
                  strokeDasharray={`${path_progress_percentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-slate-900 dark:text-white">
                {Math.round(path_progress_percentage)}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {completed_steps} of {total_steps} Steps Finished
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#42CFA5]" /> {completed_steps} Done
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#7965FF]" /> {in_progress_steps} In Progress
                </span>
              </div>
              <div className="w-36 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div 
                  className="h-full bg-gradient-to-r from-[#7965FF] to-[#42CFA5] transition-all duration-500 rounded-full"
                  style={{ width: `${path_progress_percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Role Ready Celebration Banner */}
      {is_role_ready && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-3xl bg-gradient-to-r from-[#42CFA5]/15 via-[#7965FF]/15 to-[#42CFA5]/10 border border-[#42CFA5]/30 flex items-start sm:items-center gap-4"
        >
          <div className="p-3 rounded-2xl bg-[#42CFA5]/20 text-[#42CFA5] border border-[#42CFA5]/40 flex-shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">All Foundational Competencies Mastered!</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Your profile currently satisfies all required benchmark skills for <strong className="text-slate-900 dark:text-white">{target_role}</strong>. 
              Complete the practical capstone milestone below to assemble production portfolio evidence for recruiters.
            </p>
          </div>
        </motion.div>
      )}

      {/* 4 Sequential Stages */}
      <div className="space-y-6">
        {stages.map((stage) => {
          const stageSteps = stage.steps || [];
          const stageCompletedCount = stageSteps.filter(s => s.is_completed).length;
          const isStageFinished = stageSteps.length > 0 && stageCompletedCount === stageSteps.length;

          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08]"
            >
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-center font-black text-sm ${
                    isStageFinished
                      ? 'bg-[#42CFA5]/15 border-[#42CFA5]/30 text-[#42CFA5]'
                      : 'bg-[#7965FF]/15 border-[#7965FF]/30 text-[#9B8AFF]'
                  }`}>
                    {isStageFinished ? <Check className="w-4 h-4" /> : `0${stage.stage}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Stage {stage.stage}
                      </span>
                      {isStageFinished && (
                        <span className="text-[10px] font-bold text-[#42CFA5] bg-[#42CFA5]/10 px-2 py-0.5 rounded-full border border-[#42CFA5]/20">
                          Complete
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{stage.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{stage.description}</p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 sm:text-right">
                  <span>{stageCompletedCount} of {stageSteps.length} Step{stageSteps.length !== 1 ? 's' : ''} Done</span>
                </div>
              </div>

              {/* Step Cards List */}
              {stageSteps.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-600 dark:text-slate-400">
                  No missing prerequisite skills identified in this stage.
                </div>
              ) : (
                <div className="space-y-4">
                  {stageSteps.map((step) => {
                    const primary = step.primary_resource;
                    const supplementaries = step.supplementary_resources || [];
                    const isExpanded = !!expandedAlternatives[step.skill];
                    const isUpdating = updatingId === primary?.id;

                    return (
                      <div
                        key={step.skill}
                        className={`p-5 rounded-2xl border transition-all ${
                          step.is_completed
                            ? 'bg-[#42CFA5]/[0.04] border-[#42CFA5]/25 shadow-[0_0_15px_rgba(66,207,165,0.06)]'
                            : step.is_in_progress
                              ? 'bg-[#7965FF]/[0.05] border-[#7965FF]/35 shadow-[0_0_20px_rgba(121,101,255,0.08)]'
                              : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Skill & Primary Resource Details */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {step.skill}
                              </span>
                              
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                step.is_completed
                                  ? 'bg-[#42CFA5]/15 text-[#42CFA5] border-[#42CFA5]/30'
                                  : step.is_in_progress
                                    ? 'bg-[#7965FF]/20 text-[#9B8AFF] border-[#7965FF]/40 animate-pulse'
                                    : 'bg-white/5 text-slate-600 dark:text-slate-400 border-white/10'
                              }`}>
                                {step.step_status}
                              </span>

                              <EvidenceBadge status={step.evidence_status || step.evidence?.status} />

                              {primary && (
                                <>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-slate-600 dark:text-slate-400 border border-white/10 flex items-center gap-1">
                                    {getTypeIcon(primary.resource_type)}
                                    {primary.resource_type}
                                  </span>
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getDifficultyBadge(primary.difficulty_level)}`}>
                                    {primary.difficulty_level}
                                  </span>
                                </>
                              )}
                            </div>

                            {primary ? (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span className="text-[11px] text-[#7965FF] font-bold uppercase tracking-wider">
                                    Primary Resource:
                                  </span>
                                  <span>{primary.title}</span>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-3">
                                  <span>Provider: <strong className="text-slate-800 dark:text-slate-200">{primary.provider}</strong></span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#42CFA5]" /> {primary.duration_hours}h estimated
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-amber-300/90 flex items-center gap-1.5 pt-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>No catalogued resource currently mapped. Included in path requirements.</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                            {/* Evidence / Proof-of-Work Action */}
                            <button
                              onClick={() => {
                                setSelectedEvidenceItem(step);
                                setIsEvidenceDrawerOpen(true);
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                step.evidence_status === 'Verified'
                                  ? 'bg-[#42CFA5]/15 text-[#42CFA5] border-[#42CFA5]/30 hover:bg-[#42CFA5]/25'
                                  : step.evidence_status === 'Pending Review'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                                    : step.evidence_status === 'Rejected'
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                                      : 'bg-white/5 text-slate-600 dark:text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                              }`}
                              title="Submit Proof-of-Work repository/certificate for mentor verification"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>
                                {step.evidence_status === 'Verified'
                                  ? 'Verified Proof'
                                  : step.evidence_status === 'Pending Review'
                                    ? 'Proof Pending'
                                    : step.evidence_status === 'Rejected'
                                      ? 'Revise Proof'
                                      : 'Submit Proof'}
                              </span>
                            </button>
                            {primary && (
                              <a
                                href={primary.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-900 dark:text-white border border-white/10 transition-all flex items-center gap-1.5"
                              >
                                <span>Launch</span>
                                <ExternalLink className="w-3.5 h-3.5 text-[#7965FF]" />
                              </a>
                            )}

                            {primary && (
                              <button
                                disabled={isUpdating}
                                onClick={() => {
                                  if (!step.is_in_progress && !step.is_completed) {
                                    handleStepStatusChange(step, 'In Progress');
                                  } else if (step.is_in_progress) {
                                    handleStepStatusChange(step, 'Completed');
                                  } else {
                                    handleStepStatusChange(step, 'Not Started');
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                                  step.is_completed
                                    ? 'bg-[#42CFA5]/15 hover:bg-[#42CFA5]/25 text-[#42CFA5] border border-[#42CFA5]/30'
                                    : step.is_in_progress
                                      ? 'bg-gradient-to-r from-[#7965FF] to-[#9B8AFF] hover:from-[#6A54FA] hover:to-[#8A77FF] text-white'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white border border-slate-200 dark:border-white/15'
                                }`}
                              >
                                {isUpdating ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : step.is_completed ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#42CFA5]" />
                                    <span>Completed</span>
                                    <RotateCcw className="w-3 h-3 text-[#42CFA5]/60 ml-1 hover:text-[#42CFA5]" title="Click to Reset" />
                                  </>
                                ) : step.is_in_progress ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Mark Complete</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Start Step</span>
                                  </>
                                )}
                              </button>
                            )}

                            {supplementaries.length > 0 && (
                              <button
                                onClick={() => toggleAlternative(step.skill)}
                                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-white border border-white/5 transition-all flex items-center gap-1"
                                title="Toggle supplementary resources"
                              >
                                <span className="text-[11px]">{supplementaries.length} alternative{supplementaries.length !== 1 ? 's' : ''}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Supplementary Alternatives Drawer */}
                        <AnimatePresence>
                          {isExpanded && supplementaries.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-white/5 space-y-2 overflow-hidden"
                            >
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                <Layers className="w-3 h-3 text-[#7965FF]" />
                                <span>Verified Supplementary Options (Optional - satisfy step without inflating total path)</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {supplementaries.map((sup) => {
                                  const isSupUpdating = updatingId === sup.id;
                                  const isSupCompleted = sup.status === 'Completed';

                                  return (
                                    <div
                                      key={sup.id}
                                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
                                    >
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                                          {sup.title}
                                        </div>
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                          <span>{sup.provider}</span>
                                          <span>•</span>
                                          <span>{sup.duration_hours}h</span>
                                          <span>•</span>
                                          <span className="text-[#9B8AFF]">{sup.resource_type}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <a
                                          href={sup.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-all"
                                          title="Open Resource"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>

                                        <button
                                          disabled={isSupUpdating}
                                          onClick={() => {
                                            const newStatus = isSupCompleted ? 'Not Started' : 'Completed';
                                            handleStepStatusChange(step, newStatus, sup.id);
                                          }}
                                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                            isSupCompleted
                                              ? 'bg-[#42CFA5]/20 text-[#42CFA5] border-[#42CFA5]/40'
                                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white border-slate-200 dark:border-white/10'
                                          }`}
                                        >
                                          {isSupUpdating ? '...' : isSupCompleted ? 'Satisfied' : 'Mark Done'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Stage 4: Practical Capstone Milestone Card */}
        {capstone_project && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card rounded-3xl p-6 md:p-8 border transition-all ${
              capstone_project.status === 'Completed'
                ? 'border-[#42CFA5]/40 bg-[#42CFA5]/[0.03] shadow-[0_0_25px_rgba(66,207,165,0.08)]'
                : capstone_project.status === 'In Progress'
                  ? 'border-[#7965FF]/40 bg-[#7965FF]/[0.05] shadow-[0_0_25px_rgba(121,101,255,0.1)]'
                  : 'border-white/[0.08]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#7965FF]/20 to-[#42CFA5]/20 border border-[#7965FF]/30 text-white flex items-center justify-center font-black text-sm">
                  04
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      Stage 4: Practical Capstone Milestone
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      capstone_project.status === 'Completed'
                        ? 'bg-[#42CFA5]/15 text-[#42CFA5] border-[#42CFA5]/30'
                        : capstone_project.status === 'In Progress'
                          ? 'bg-[#7965FF]/20 text-[#9B8AFF] border-[#7965FF]/40 animate-pulse'
                          : 'bg-white/5 text-slate-600 dark:text-slate-400 border-white/10'
                    }`}>
                      {capstone_project.status}
                    </span>
                    <EvidenceBadge status={capstone_project.evidence_status || capstone_project.evidence?.status} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">{capstone_project.title}</h4>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Capstone Proof-of-Work Submission Action */}
                <button
                  onClick={() => {
                    setSelectedEvidenceItem({ ...capstone_project, isCapstone: true, task_type: 'capstone' });
                    setIsEvidenceDrawerOpen(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    capstone_project.evidence_status === 'Verified'
                      ? 'bg-[#42CFA5]/15 text-[#42CFA5] border-[#42CFA5]/30 hover:bg-[#42CFA5]/25'
                      : capstone_project.evidence_status === 'Pending Review'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                        : capstone_project.evidence_status === 'Rejected'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-gradient-to-r from-[#7965FF]/20 to-[#42CFA5]/20 hover:from-[#7965FF]/30 hover:to-[#42CFA5]/30 text-white border border-[#7965FF]/40 shadow-sm'
                  }`}
                  title="Submit Capstone project repository and deployment for mentor review"
                >
                  <Shield className="w-3.5 h-3.5 text-[#42CFA5]" />
                  <span>
                    {capstone_project.evidence_status === 'Verified'
                      ? 'Verified Capstone'
                      : capstone_project.evidence_status === 'Pending Review'
                        ? 'Capstone Under Review'
                        : capstone_project.evidence_status === 'Rejected'
                          ? 'Revise Capstone'
                          : 'Submit Capstone Proof'}
                  </span>
                </button>

                <a
                  href={capstone_project.github_starter_url || 'https://github.com/new'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-900 dark:text-white border border-white/10 transition-all flex items-center gap-1.5"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-[#42CFA5]" />
                  <span>GitHub Starter</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                </a>

                <button
                  disabled={updatingId === 'capstone'}
                  onClick={() => {
                    const next = capstone_project.status === 'Completed'
                      ? 'Not Started'
                      : capstone_project.status === 'In Progress'
                        ? 'Completed'
                        : 'In Progress';
                    handleCapstoneStatusChange(next);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                    capstone_project.status === 'Completed'
                      ? 'bg-[#42CFA5]/15 hover:bg-[#42CFA5]/25 text-[#42CFA5] border border-[#42CFA5]/30'
                      : capstone_project.status === 'In Progress'
                        ? 'bg-gradient-to-r from-[#7965FF] to-[#9B8AFF] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white border border-slate-200 dark:border-white/15'
                  }`}
                >
                  {updatingId === 'capstone' ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : capstone_project.status === 'Completed' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Capstone Finished</span>
                      <RotateCcw className="w-3 h-3 text-[#42CFA5]/60 ml-1 hover:text-[#42CFA5]" title="Reset" />
                    </>
                  ) : capstone_project.status === 'In Progress' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Capstone Complete</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Capstone</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              {capstone_project.description}
            </p>

            {/* Deliverables Checklist */}
            {capstone_project.deliverables && capstone_project.deliverables.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Required Portfolio Deliverables
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {capstone_project.deliverables.map((deliv, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#7965FF]/20 border border-[#7965FF]/40 text-[#9B8AFF] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed">{deliv}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Evidence Drawer Modal */}
      <EvidenceDrawer
        isOpen={isEvidenceDrawerOpen}
        onClose={() => setIsEvidenceDrawerOpen(false)}
        targetItem={selectedEvidenceItem}
        onSuccess={() => {
          loadLearningPath();
          if (onProgressUpdated) onProgressUpdated();
        }}
      />

      {/* Mentor Review Queue Modal */}
      <MentorReviewQueue
        isOpen={isReviewQueueOpen}
        onClose={() => setIsReviewQueueOpen(false)}
        onReviewComplete={() => {
          loadLearningPath();
          if (onProgressUpdated) onProgressUpdated();
        }}
      />
    </div>
  );
}
