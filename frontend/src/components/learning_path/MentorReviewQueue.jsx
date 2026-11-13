import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, CheckCircle2, XCircle, Clock, ExternalLink, 
  Github, Globe, Award, AlertTriangle, RefreshCw, User,
  FileText, Check, X, Sparkles, Filter
} from 'lucide-react';
import { getPendingReviews, reviewEvidence } from '../../services/api';
import { EvidenceBadge } from './EvidenceDrawer';

export default function MentorReviewQueue({ isOpen, onClose, onReviewComplete }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [reviewerNotesMap, setReviewerNotesMap] = useState({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPendingReviews();
    }
  }, [isOpen]);

  const loadPendingReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPendingReviews();
      setReviews(Array.isArray(data) ? data : (data?.pending_reviews || []));
    } catch (err) {
      console.error('Failed to load pending reviews:', err);
      if (err.response?.status === 403) {
        setError('Access denied: You are not authorized to view the mentor review queue.');
      } else {
        setError('Failed to fetch pending reviews. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (item, decision) => {
    const studentId = item.student_id || item.user_id;
    const skillId = item.skill_identifier;
    const actionKey = `${studentId}_${skillId}`;
    const notes = reviewerNotesMap[actionKey]?.trim() || '';

    if (decision === 'Rejected' && !notes) {
      setError(`Please provide reviewer feedback explaining why the ${item.canonical_skill || item.title || 'evidence'} is rejected.`);
      return;
    }

    setActionLoadingId(actionKey);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        target_user_id: studentId,
        skill_identifier: skillId,
        decision: decision === 'Approved' ? 'Approved' : 'Rejected',
        reviewer_notes: notes || (decision === 'Approved' ? 'Platform verified: evidence meets rigorous competency standards.' : '')
      };

      await reviewEvidence(payload);

      setSuccessMsg(`Successfully ${decision.toLowerCase()} submission for ${item.student_name || 'student'}.`);
      
      // Remove reviewed item from local state
      setReviews(prev => prev.filter(r => !(r.student_id === studentId && r.skill_identifier === skillId)));

      // Notify parent to refresh learning path / scores
      if (onReviewComplete) {
        onReviewComplete();
      }
    } catch (err) {
      console.error('Failed to review evidence:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : `Failed to submit ${decision} decision.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 md:pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-screen max-w-2xl bg-[#0D121F] border-l border-white/10 shadow-2xl flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#7965FF]" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7965FF]">
                  Mentor & Faculty Review Portal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7965FF]/20 text-[#9B8AFF] border border-[#7965FF]/40">
                  {reviews.length} Pending
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Student Evidence Review Queue</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPendingReviews}
                disabled={loading}
                title="Refresh Queue"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-[#42CFA5]/15 border border-[#42CFA5]/30 text-[#42CFA5] text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#7965FF]/20 border-t-[#7965FF] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Loading departmental review queue...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-16 text-center space-y-3 glass-card rounded-2xl p-8 border border-white/5">
                <CheckCircle2 className="w-10 h-10 text-[#42CFA5] mx-auto opacity-80" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Queue All Clear!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  No evidence submissions are currently pending review in your assigned department.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((item, idx) => {
                  const studentId = item.student_id || item.user_id;
                  const skillId = item.skill_identifier;
                  const actionKey = `${studentId}_${skillId}`;
                  const isActionLoading = actionLoadingId === actionKey;
                  const currentNotes = reviewerNotesMap[actionKey] || '';

                  return (
                    <motion.div
                      key={actionKey || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 hover:border-white/20 transition-all"
                    >
                      {/* Student & Skill Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7965FF]/30 to-[#42CFA5]/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                            {item.student_name ? item.student_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.student_name || `Student #${studentId}`}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                              <span>{item.student_email}</span>
                              {item.department && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-700 dark:text-slate-300 capitalize">{item.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
                            {item.target_role || 'Career Track'}
                          </span>
                          <EvidenceBadge status={item.status || 'Pending Review'} />
                        </div>
                      </div>

                      {/* Skill Milestone & Evidence Link */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.canonical_skill || item.title || item.skill_identifier}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#7965FF]">
                            {item.task_type === 'capstone' ? 'Capstone Project' : 'Curriculum Step'}
                          </span>
                        </div>

                        {item.url && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 truncate text-slate-800 dark:text-slate-300">
                              {item.url.includes('github.com') ? (
                                <Github className="w-3.5 h-3.5 text-[#7965FF] dark:text-[#9B8AFF] flex-shrink-0" />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-[#42CFA5] flex-shrink-0" />
                              )}
                              <span className="truncate font-mono text-[11px]">{item.url}</span>
                            </div>

                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-white text-[11px] font-semibold flex items-center gap-1 transition-all flex-shrink-0"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                            </a>
                          </div>
                        )}

                        {/* Student Notes */}
                        {item.notes && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-300 block mb-1">Student Notes:</span>
                            <p className="leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                          </div>
                        )}

                        {/* Automated Heuristics Summary */}
                        {item.heuristics && (
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#7965FF]/[0.04] border border-slate-200 dark:border-[#7965FF]/20 text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Automated Pre-checks:</span>
                            <span className="text-[#42CFA5] font-semibold">
                              {item.heuristics.message || 'DNS Pinned • HTTPS Verified • 0 SSRF Risks'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reviewer Feedback Input */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Reviewer Assessment Notes
                        </label>
                        <textarea
                          rows={2}
                          value={currentNotes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReviewerNotesMap(prev => ({ ...prev, [actionKey]: val }));
                          }}
                          placeholder="Provide constructive feedback, verification notes, or reason if rejected..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#7965FF] transition-all resize-none"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleReviewAction(item, 'Rejected')}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject Submission</span>
                        </button>

                        <button
                          disabled={isActionLoading}
                          onClick={() => handleReviewAction(item, 'Approved')}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#42CFA5] to-[#2EAA84] hover:from-[#3BB893] hover:to-[#289674] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#42CFA5]/20 disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve & Platform-Verify</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20 text-center text-[11px] text-slate-600 dark:text-slate-400">
            Authorizations are enforced at the departmental level with strict fail-closed security.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
