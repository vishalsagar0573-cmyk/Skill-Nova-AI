import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, Loader2, BrainCircuit, CheckCircle2, ChevronRight, User, Briefcase, Code2, BookOpen, BarChart3, Calculator } from 'lucide-react';
import axios from 'axios';

export default function CompetencyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');
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
        setError('Failed to load profile.');
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
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate profile. Ensure you have filled out the Student Profile.');
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
      setCalcError(err.response?.data?.detail || 'Failed to calculate scores.');
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

  if (!profile) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-[80vh] flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden max-w-2xl w-full"
        >
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10"></div>
          <Network className="w-20 h-20 text-primary mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4 gradient-text">Unified Competency Profile</h2>
          <p className="text-gray-400 mb-8 text-lg">
            We will merge your Student Profile data with your Parsed Resume data, normalize your skills, and generate a structured JSON competency map ready for AI evaluation.
          </p>
          
          {error && <p className="text-rose-400 mb-6 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</p>}
          
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="bg-primary hover:bg-indigo-600 disabled:bg-primary/50 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 mx-auto text-lg"
          >
            {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <BrainCircuit className="w-6 h-6" />}
            {generating ? 'Aggregating Data & Generating...' : 'Generate Unified Profile'}
          </button>
        </motion.div>
      </div>
    );
  }

  const data = profile.competency_json;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
          <Network className="w-10 h-10 text-primary" /> Unified Competency Profile
        </h1>
        <p className="text-gray-400 mt-2 text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Successfully merged and normalized from Student Profile & Resume Data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Meta & Skills */}
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -z-10"></div>
            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Candidate Meta</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Target Role</p>
                <p className="font-semibold text-lg text-secondary bg-secondary/10 px-3 py-1 rounded-lg inline-block border border-secondary/20">
                  {data.preferred_job_role || 'Not specified'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">CGPA</p>
                  <p className="font-bold text-white text-lg">{data.cgpa || 'N/A'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">DSA Level</p>
                  <p className="font-bold text-white text-lg capitalize">{data.dsa_level || 'N/A'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Code2 className="w-5 h-5 text-primary" /> Normalized Skills</h3>
            <div className="flex flex-wrap gap-2">
              {data.skills?.map((skill, idx) => (
                <span key={idx} className="bg-white/10 text-gray-200 px-3 py-1 rounded-full text-sm border border-white/10 hover:bg-white/20 transition-colors">
                  {skill}
                </span>
              ))}
              {(!data.skills || data.skills.length === 0) && <p className="text-gray-500 italic text-sm">No skills found.</p>}
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl">
             <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Pipeline Status</h3>
             <p className="text-sm text-gray-400 mb-4">Tracking your data through the unified competency pipeline.</p>
             <div className="space-y-3">
               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                 <span className="text-gray-300">Student Profile</span>
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                 <span className="text-gray-300">Resume Uploaded</span>
                 {profile.resume_uploaded ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600 italic">N/A</span>}
               </div>
               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                 <span className="text-gray-300">Resume Parsed</span>
                 {profile.resume_parsed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600 italic">N/A</span>}
               </div>
               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                 <span className="text-gray-300">Competency Profile</span>
                 {profile.profile_generated ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600 italic">N/A</span>}
               </div>
               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                 <span className="text-gray-300">ML Prediction</span>
                 {pipelineStatus.ml_prediction ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600 italic">Pending</span>}
               </div>
               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                 <span className="text-gray-300">Job Matching</span>
                 {pipelineStatus.job_matching ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600 italic">Pending</span>}
               </div>
               <div className="flex justify-between items-center text-sm pb-2">
                 <span className="text-gray-300">Recommendation</span>
                 {pipelineStatus.recommendation ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600 italic">Pending</span>}
               </div>
             </div>
          </motion.div>
        </div>

        {/* Right Column - Arrays Data */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          {/* Competency Scores */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Competency Scores</h3>
              <button 
                onClick={handleCalculateScores}
                disabled={calculating}
                className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {calculating ? 'Calculating...' : (profile.overall_score != null ? 'Recalculate' : 'Calculate Scores')}
              </button>
            </div>
            {calcError && <p className="text-rose-400 mb-4 text-sm">{calcError}</p>}
            
            {profile.overall_score != null ? (
              <div className="space-y-5">
                {[
                  { label: "Overall Competency", score: profile.overall_score, color: "bg-indigo-500", expl: profile.score_explanations?.overall_score },
                  { label: "Frontend", score: profile.frontend_score, color: "bg-blue-500", expl: profile.score_explanations?.frontend_score },
                  { label: "Backend", score: profile.backend_score, color: "bg-emerald-500", expl: profile.score_explanations?.backend_score },
                  { label: "Database", score: profile.database_score, color: "bg-amber-500", expl: profile.score_explanations?.database_score },
                  { label: "AI/ML", score: profile.ai_ml_score, color: "bg-purple-500", expl: profile.score_explanations?.ai_ml_score },
                  { label: "Programming", score: profile.programming_score, color: "bg-rose-500", expl: profile.score_explanations?.programming_score },
                  { label: "Soft Skills", score: profile.soft_skill_score, color: "bg-cyan-500", expl: profile.score_explanations?.soft_skill_score },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-300 font-medium">{item.label}</span>
                      <span className="text-white font-bold">{Math.round(item.score || 0)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5 mb-1 overflow-hidden">
                      <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${item.score || 0}%` }}></div>
                    </div>
                    {item.expl && <p className="text-xs text-gray-500 line-clamp-1" title={item.expl}>{item.expl}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Scores have not been calculated yet. Click the button above to evaluate your profile.</p>
            )}
          </motion.div>
          
          {/* Projects */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><Code2 className="w-6 h-6 text-primary" /> Unified Projects</h3>
            {data.projects?.length > 0 ? (
              <div className="space-y-4">
                {data.projects.map((proj, idx) => (
                  <div key={idx} className="bg-black/30 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    {typeof proj === 'string' ? (
                      <p className="text-gray-300">{proj}</p> // From resume string
                    ) : (
                      <>
                        <h4 className="font-bold text-lg text-white mb-1">{proj.project_name}</h4>
                        <p className="text-sm text-primary mb-3">{proj.technology}</p>
                        <p className="text-gray-400 text-sm">{proj.description}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No projects recorded.</p>
            )}
          </motion.div>

          {/* Internships/Experience */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" /> Experience & Internships</h3>
            {data.internships?.length > 0 || data.experience?.length > 0 ? (
              <div className="space-y-4">
                {data.internships?.map((intern, idx) => (
                  <div key={`int-${idx}`} className="bg-black/30 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    {typeof intern === 'string' ? (
                       <p className="text-gray-300"><ChevronRight className="inline w-4 h-4 text-primary"/> {intern}</p>
                    ) : (
                      <>
                        <h4 className="font-bold text-lg text-white mb-1">{intern.role} <span className="text-gray-500 font-normal">at</span> {intern.company}</h4>
                        <p className="text-gray-400 text-sm mt-2">{intern.description}</p>
                      </>
                    )}
                  </div>
                ))}
                {data.experience?.map((exp, idx) => (
                  <div key={`exp-${idx}`} className="bg-black/30 p-4 rounded-2xl border border-white/5 border-l-4 border-l-primary/50">
                    <p className="text-gray-300 text-sm"><span className="text-xs text-primary/70 uppercase tracking-wider font-bold mb-1 block">From Resume</span>{exp}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No experience recorded.</p>
            )}
          </motion.div>

          {/* Education & Certs */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Education & Certifications</h3>
            
            {data.education?.length > 0 && (
              <div className="mb-6 space-y-3">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Education Parsing</h4>
                {data.education.map((edu, idx) => (
                  <p key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5 text-gray-300 text-sm">🎓 {edu}</p>
                ))}
              </div>
            )}
            
            {data.certifications?.length > 0 ? (
              <div className="space-y-3 mt-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Certifications</h4>
                {data.certifications.map((cert, idx) => (
                  <div key={`cert-${idx}`} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    {typeof cert === 'string' ? (
                       <p className="text-gray-300 mt-1">{cert}</p>
                    ) : (
                      <div>
                        <h4 className="font-bold text-white">{cert.certificate_name}</h4>
                        <p className="text-sm text-gray-400">{cert.platform}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No certifications recorded.</p>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
