import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, CheckCircle2, Loader2, BrainCircuit, FileText, 
  AlertCircle, ArrowRight, ShieldCheck, Cpu, RefreshCw, X
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ProfileForm() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const validateAndSetFile = (selected) => {
    if (!selected) return;
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExt = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      setError('Please upload a valid PDF or Word document (.pdf, .doc, .docx).');
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit. Please upload a smaller document.');
      setFile(null);
      return;
    }

    setFile(selected);
    setError('');
    setUploadSuccess(false);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    validateAndSetFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a resume file first.');
      return;
    }

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:8000/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload and parse resume. Please ensure the document is readable and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setGenerating(true);
    setError('');
    try {
      await axios.post('http://localhost:8000/api/competency-profile/generate');
      navigate('/competency-profile');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to synthesize competency profile. Please ensure you have completed your Student Profile.');
      setGenerating(false);
    }
  };

  const resetSelection = () => {
    setFile(null);
    setUploadSuccess(false);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Determine active pipeline stage
  const currentStage = generating ? 4 : uploadSuccess ? 3 : uploading ? 2 : file ? 1 : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl min-h-[85vh] flex flex-col justify-center">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7965FF]/10 border border-[#7965FF]/25 text-xs font-semibold text-[#9B8AFF] mb-3">
          <Cpu className="w-3.5 h-3.5 text-[#7965FF]" />
          <span>Stage 2 • Resume Intelligence Ingestion</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          Resume <span className="gradient-text">Intelligence Parser</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Upload your resume in PDF or Word format. Our multi-stage lexical parser extracts technical proficiencies, work history, and project milestones to fuse with your academic metrics into a normalized competency profile.
        </p>
      </motion.div>

      {/* 4-Stage Ingestion Pipeline Progress */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4 md:p-5 mb-8 border border-white/[0.08]"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: 1, title: 'Document Selection', desc: file ? file.name : 'Select PDF/DOCX' },
            { step: 2, title: 'Text Extraction', desc: uploading ? 'Processing stream...' : uploadSuccess ? 'Extracted' : 'Awaiting file' },
            { step: 3, title: 'Skill Normalization', desc: uploadSuccess ? 'Taxonomy aligned' : 'Pending parsing' },
            { step: 4, title: 'Competency Fusion', desc: generating ? 'Synthesizing...' : 'Final map sync' },
          ].map((s) => {
            const isCompleted = currentStage > s.step;
            const isCurrent = currentStage === s.step;
            return (
              <div 
                key={s.step} 
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-[#7965FF]/15 border-[#7965FF]/40 shadow-[0_0_15px_rgba(121,101,255,0.2)]'
                    : isCompleted
                      ? 'bg-[#42CFA5]/10 border-[#42CFA5]/30'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent 
                      ? 'bg-[#7965FF] text-white animate-pulse'
                      : isCompleted
                        ? 'bg-[#42CFA5] text-[#080B18]'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}>
                    {isCompleted ? '✓' : s.step}
                  </div>
                  <span className={`text-xs font-bold truncate ${isCurrent ? 'text-slate-900 dark:text-white' : isCompleted ? 'text-[#42CFA5]' : 'text-slate-600 dark:text-slate-400'}`}>
                    {s.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate pl-7">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Main Upload Zone */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-3xl p-6 md:p-10 border border-white/[0.08] relative overflow-hidden shadow-2xl mb-8"
      >
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7965FF]/10 rounded-full blur-[90px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#42CFA5]/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          id="resume-upload" 
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
        />

        {/* Upload Container */}
        {!uploadSuccess ? (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all ${
              isDragging 
                ? 'border-[#7965FF] bg-[#7965FF]/10 scale-[1.01]' 
                : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:border-slate-400 dark:hover:border-white/25'
            }`}
          >
            {/* Center Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#7965FF]/20 to-[#42CFA5]/10 border border-[#7965FF]/30 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(121,101,255,0.2)]">
              <UploadCloud className="w-10 h-10 text-[#7965FF]" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isDragging ? 'Drop resume file here' : 'Upload your Resume'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
              Drag and drop your file here, or click browse to select from your device. Supported formats: PDF, DOC, or DOCX up to 10MB.
            </p>

            {/* Selected File Badge */}
            {file && (
              <div className="mb-6 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 max-w-md w-full justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileText className="w-5 h-5 text-[#7965FF] shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={resetSelection} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-[#F16C83] transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Button Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label 
                htmlFor="resume-upload" 
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-semibold text-xs md:text-sm hover:bg-white/10 hover:border-white/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#9B8AFF]" />
                <span>{file ? 'Choose Different File' : 'Browse Files'}</span>
              </label>

              {file && (
                <button 
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#7965FF] to-[#6854EA] hover:from-[#6854EA] hover:to-[#5743D9] disabled:opacity-50 text-white font-bold text-xs md:text-sm transition-all shadow-[0_0_20px_rgba(121,101,255,0.4)] flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing & Extracting...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload & Parse</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Succeeded State Card */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-2xl bg-[#42CFA5]/10 border border-[#42CFA5]/30 text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#42CFA5]/20 border border-[#42CFA5]/40 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(66,207,165,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-[#42CFA5]" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Resume Uploaded & Parsed Successfully!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mb-6 leading-relaxed">
              We extracted skills, projects, and career experiences from <span className="text-slate-900 dark:text-white font-semibold">{file?.name}</span>. Now aggregate this with your verified Student Profile to build your Unified Competency Profile.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-md">
              <button 
                type="button" 
                onClick={handleAnalyze}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#42CFA5] to-[#2DD4BF] hover:from-[#38B791] hover:to-[#22B9A6] text-[#080B18] font-extrabold py-3.5 px-6 rounded-xl shadow-[0_0_25px_rgba(66,207,165,0.4)] transition-all text-sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#080B18]" />
                    <span>Synthesizing Competencies...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-4 h-4 text-[#080B18]" />
                    <span>Generate Unified Competency Profile</span>
                    <ArrowRight className="w-4 h-4 text-[#080B18]" />
                  </>
                )}
              </button>

              <button 
                type="button" 
                onClick={resetSelection}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors flex items-center gap-1.5 pt-1"
              >
                <RefreshCw className="w-3 h-3" /> Upload a different document
              </button>
            </div>
          </motion.div>
        )}

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 rounded-xl bg-[#F16C83]/10 border border-[#F16C83]/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-[#F16C83] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-900 dark:text-white">
                <p className="font-semibold text-[#F16C83] mb-0.5">Ingestion Error</p>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Ingestion Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-[#7965FF]/15 border border-[#7965FF]/25 flex items-center justify-center mb-3">
            <Cpu className="w-4 h-4 text-[#7965FF]" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Lexical Skill Extraction</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Extracts explicit technical languages, frameworks, developer tools, and certifications with exact keyword token matching.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-[#42CFA5]/15 border border-[#42CFA5]/25 flex items-center justify-center mb-3">
            <BrainCircuit className="w-4 h-4 text-[#42CFA5]" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Taxonomy Normalization</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Normalizes skill aliases (e.g., 'React.js' to 'React', 'py' to 'Python') to maintain consistency with the job market ontology.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4 text-[#9B8AFF]" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Private Local Ingestion</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Parsed resume files are handled securely within your local platform deployment with complete candidate data privacy.
          </p>
        </div>
      </div>
    </div>
  );
}

