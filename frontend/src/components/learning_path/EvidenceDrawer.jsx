import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, Clock, AlertTriangle, HelpCircle, 
  ExternalLink, Github, Globe, Award, Send, RefreshCw,
  ShieldCheck, FileText, ArrowRight, Check
} from 'lucide-react';
import { submitStepEvidence, submitCapstoneEvidence } from '../../services/api';

export const EvidenceBadge = ({ status }) => {
  const normalized = status || 'Not Submitted';

  switch (normalized) {
    case 'Verified':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#42CFA5]/15 text-[#42CFA5] border border-[#42CFA5]/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified</span>
        </span>
      );
    case 'Pending Review':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Review</span>
        </span>
      );
    case 'Submitted':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <Send className="w-3.5 h-3.5" />
          <span>Submitted</span>
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Rejected</span>
        </span>
      );
    case 'Inconclusive':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Inconclusive</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-600 dark:text-slate-400 border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span>Not Submitted</span>
        </span>
      );
  }
};

export default function EvidenceDrawer({ isOpen, onClose, targetItem, onSuccess }) {
  if (!isOpen || !targetItem) return null;

  const isCapstone = targetItem.task_type === 'capstone' || targetItem.isCapstone;
  const existingEvidence = targetItem.evidence || null;
  const currentStatus = existingEvidence?.status || targetItem.evidence_status || 'Not Submitted';

  // Form states
  const [evidenceType, setEvidenceType] = useState(
    existingEvidence?.evidence_type || (isCapstone ? 'github_repo' : 'github_repo')
  );
  const [primaryUrl, setPrimaryUrl] = useState(
    existingEvidence?.url || existingEvidence?.repo_url || ''
  );
  const [liveUrl, setLiveUrl] = useState(
    existingEvidence?.live_url || existingEvidence?.deployment_url || ''
  );
  const [notes, setNotes] = useState(
    existingEvidence?.notes || existingEvidence?.deliverables_summary || ''
  );
  const [architectureNotes, setArchitectureNotes] = useState(
    existingEvidence?.architecture_notes || ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Basic URL validation
    const trimmedUrl = primaryUrl.trim();
    if (!trimmedUrl) {
      setError('Please provide a valid evidence URL.');
      return;
    }
    if (!trimmedUrl.startsWith('https://')) {
      setError('Evidence URLs must strictly use https:// protocol for security.');
      return;
    }

    if (liveUrl.trim() && !liveUrl.trim().startsWith('https://')) {
      setError('Live project URLs must strictly use https:// protocol.');
      return;
    }

    setLoading(true);

    try {
      if (isCapstone) {
        const payload = {
          url: trimmedUrl,
          deployment_url: liveUrl.trim() || null,
          notes: `${notes.trim()}${architectureNotes.trim() ? `\n\nArchitecture Notes:\n${architectureNotes.trim()}` : ''}`
        };
        const result = await submitCapstoneEvidence(payload);
        setSuccessMsg(
          result.status === 'Verified'
            ? 'Capstone verified successfully!'
            : 'Capstone evidence submitted! It is now pending mentor review.'
        );
      } else {
        const payload = {
          skill_identifier: targetItem.skill_identifier || targetItem.skill?.toLowerCase().replace(' ', '_'),
          canonical_skill: targetItem.canonical_skill || targetItem.skill,
          evidence_type: evidenceType,
          url: trimmedUrl,
          live_url: liveUrl.trim() || null,
          notes: notes.trim() || ''
        };
        const result = await submitStepEvidence(payload);
        if (result.status === 'Rejected') {
          setError(`Submission rejected: ${result.rejection_reason || 'Security or repository validation failed.'}`);
        } else if (result.status === 'Inconclusive') {
          setSuccessMsg('Evidence received. Automated checks were inconclusive (e.g. rate limit/timeout); queued for manual mentor review.');
        } else {
          setSuccessMsg('Evidence submitted successfully! Status is now Pending Review.');
        }
      }

      // Notify parent to refresh learning path & scores
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Evidence submission error:', err);
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Failed to submit evidence. Please ensure repository is public and accessible.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isVerified = currentStatus === 'Verified';
  const isPending = currentStatus === 'Pending Review' || currentStatus === 'Submitted';
  const isRejected = currentStatus === 'Rejected';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-screen max-w-md bg-[#0D121F] border-l border-white/10 shadow-2xl flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7965FF]">
                  {isCapstone ? 'Milestone Proof-of-Work' : 'Skill Proof-of-Work'}
                </span>
                <EvidenceBadge status={currentStatus} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isCapstone ? targetItem.title : targetItem.canonical_skill || targetItem.skill}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Status Feedback Card */}
            {isVerified && (
              <div className="p-4 rounded-2xl bg-[#42CFA5]/10 border border-[#42CFA5]/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#42CFA5]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Platform Competency Verified</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  This skill milestone has been reviewed and verified by an authorized department mentor.
                  Competency scores and career readiness metrics have been elevated.
                </p>
                {existingEvidence?.verified_by && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    Verified by: <span className="text-slate-800 dark:text-slate-200 font-medium">{existingEvidence.verified_by}</span>
                  </div>
                )}
                {existingEvidence?.url && (
                  <div className="pt-1">
                    <a
                      href={existingEvidence.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#42CFA5] hover:underline"
                    >
                      <span>View Verified Submission</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {isRejected && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Submission Needs Revision</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Reviewer feedback:
                </p>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 text-xs font-mono text-rose-700 dark:text-rose-200 border border-rose-500/20">
                  {existingEvidence?.reviewer_notes || existingEvidence?.rejection_reason || 'Evidence does not meet verification requirements. Please review guidelines and resubmit.'}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  You can update the repository link, add more detailed notes, and resubmit below.
                </p>
              </div>
            )}

            {isPending && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span>Awaiting Mentor Review</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Your evidence passed automated transport and security checks. It is currently in your department mentor's review queue.
                </p>
                {existingEvidence?.url && (
                  <a
                    href={existingEvidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline pt-1"
                  >
                    <span>View Submitted URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Error & Success Messages */}
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

            {/* Evidence Submission Form */}
            {!isVerified && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Evidence Type Pills (for steps) */}
                {!isCapstone && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                      Evidence Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEvidenceType('github_repo')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                          evidenceType === 'github_repo'
                            ? 'bg-[#7965FF] text-white shadow-sm border-[#7965FF]'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <Github className={`w-4 h-4 ${evidenceType === 'github_repo' ? 'text-white' : 'text-[#7965FF]'}`} />
                        <span>GitHub</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEvidenceType('live_project')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                          evidenceType === 'live_project'
                            ? 'bg-[#7965FF] text-white shadow-sm border-[#7965FF]'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <Globe className={`w-4 h-4 ${evidenceType === 'live_project' ? 'text-white' : 'text-[#42CFA5]'}`} />
                        <span>Live Demo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEvidenceType('certificate')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                          evidenceType === 'certificate'
                            ? 'bg-[#7965FF] text-white shadow-sm border-[#7965FF]'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <Award className={`w-4 h-4 ${evidenceType === 'certificate' ? 'text-white' : 'text-amber-500'}`} />
                        <span>Certificate</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                    {isCapstone
                      ? 'GitHub Repository URL *'
                      : evidenceType === 'github_repo'
                      ? 'GitHub Repository URL *'
                      : evidenceType === 'live_project'
                      ? 'Live Application URL *'
                      : 'Certificate Verification URL *'}
                  </label>
                  <input
                    type="url"
                    required
                    value={primaryUrl}
                    onChange={(e) => setPrimaryUrl(e.target.value)}
                    placeholder={
                      evidenceType === 'github_repo' || isCapstone
                        ? 'https://github.com/your-username/your-repo'
                        : 'https://...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7965FF] transition-all"
                  />
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">
                    Must strictly begin with https:// and point to a public, verifiable domain.
                  </span>
                </div>

                {/* Optional Live Demo URL (for Capstone or GitHub evidence) */}
                {(isCapstone || evidenceType === 'github_repo') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                      Live Deployment URL <span className="text-slate-600 dark:text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      placeholder="https://your-deployment.vercel.app"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7965FF] transition-all"
                    />
                  </div>
                )}

                {/* Notes / Deliverables Summary */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                    {isCapstone ? 'Deliverables Summary *' : 'Supporting Notes & Context'}
                  </label>
                  <textarea
                    rows={isCapstone ? 3 : 2}
                    required={isCapstone}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      isCapstone
                        ? 'Summarize implemented features, test suite coverage, and Docker compose setup...'
                        : 'Highlight key implementations, test coverage, or learned patterns...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7965FF] transition-all resize-none"
                  />
                </div>

                {/* Architecture Notes (Capstone Only) */}
                {isCapstone && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                      Architecture & Design Decisions <span className="text-slate-600 dark:text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={architectureNotes}
                      onChange={(e) => setArchitectureNotes(e.target.value)}
                      placeholder="Describe database choice, background workers, caching strategies..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7965FF] transition-all resize-none"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7965FF] to-[#9B8AFF] hover:from-[#6B55FF] hover:to-[#8B78FF] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7965FF]/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Verifying & Submitting...</span>
                    </>
                  ) : isRejected ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Resubmit Revised Evidence</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit for Mentor Verification</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-white/10 bg-black/20 text-center text-[11px] text-slate-600 dark:text-slate-400">
            Evidence is validated with DNS pinning & SSRF protections. Final promotion requires faculty approval.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
