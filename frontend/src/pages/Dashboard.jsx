import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { UploadCloud, CheckCircle2, Loader2, Target, TrendingUp, AlertCircle, BookOpen, Briefcase, FileText, Activity, ShieldCheck, Bell, Clock, User, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { uploadResume, getJobMatches, getCourseRecommendations } from '../services/api';
import axios from 'axios';
import { DashboardCard, ProgressCard, QuickActionCard, ChartCard, TimelineCard, RecommendationCard, CircularProgress } from '../components/dashboard/DashboardComponents';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle'); // idle, uploading, analyzing, complete
  const [error, setError] = useState('');
  
  const [parsedData, setParsedData] = useState(null);
  const [jobMatches, setJobMatches] = useState([]);
  const [courses, setCourses] = useState([]);

  const [dashboardData, setDashboardData] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/dashboard');
      if (res.data) {
        setDashboardData(res.data);
      }
      
      try {
        const mlRes = await axios.post('http://localhost:8000/api/ml/predict');
        setMlPrediction(mlRes.data);
      } catch (mlErr) {
        console.error("ML Prediction Error:", mlErr);
      }
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.type.includes('pdf')) {
        setError('For optimal NLP parsing, please upload a PDF file.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    try {
      setStep('uploading');
      setError('');
      const uploadRes = await uploadResume(file);
      setParsedData(uploadRes.parsed_data);
      setStep('analyzing');
      const matches = await getJobMatches(1);
      setJobMatches(matches);
      let missingSkillsSet = new Set();
      matches.forEach(job => {
        job.missing_skills.forEach(skill => missingSkillsSet.add(skill));
      });
      const missingSkillsArray = Array.from(missingSkillsSet);
      if (missingSkillsArray.length > 0) {
        const recs = await getCourseRecommendations(missingSkillsArray);
        setCourses(recs);
      }
      setStep('complete');
      fetchDashboard(); // Refresh dash data after upload
    } catch (err) {
      console.error(err);
      setError('An error occurred during AI processing.');
      setStep('idle');
    }
  };

  if (loadingDashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const hasData = dashboardData && dashboardData.competency_scores;

  // If no data and idle, show empty state/uploader
  if (step === 'idle' && !hasData) {
    return (
      <div className="container mx-auto p-8 max-w-4xl min-h-[80vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass p-12 rounded-3xl border border-white/5 shadow-2xl text-center w-full relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
          <h2 className="text-3xl font-bold mb-4 gradient-text">SkillNova AI Analyzer</h2>
          <p className="text-gray-400 mb-10">Welcome! Upload your PDF resume to instantly map your career trajectory.</p>
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors group relative">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Upload your Resume</h3>
            <p className="text-gray-400 text-sm mb-8 max-w-sm">{file ? file.name : 'Drag and drop your PDF file here, or click to browse files.'}</p>
            <input type="file" className="hidden" id="resume-upload" accept=".pdf" onChange={handleFileChange} />
            <div className="flex gap-4">
              <label htmlFor="resume-upload" className="bg-white/10 border border-white/10 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/20 transition-all cursor-pointer shadow-lg">
                {file ? 'Change File' : 'Browse Files'}
              </label>
              {file && (
                <button onClick={handleProcess} className="bg-primary hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                  Analyze Profile
                </button>
              )}
            </div>
            {error && <p className="text-rose-400 mt-6 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">{error}</p>}
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'uploading' || step === 'analyzing') {
    return (
      <div className="container mx-auto p-8 max-w-4xl min-h-[80vh] flex items-center justify-center">
        <motion.div className="glass p-12 rounded-3xl border border-white/5 shadow-2xl text-center w-full relative overflow-hidden">
          <div className="flex flex-col items-center py-10">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">
              {step === 'uploading' ? 'Extracting NLP Entities...' : 'Calculating ML Vector Matches...'}
            </h3>
            <p className="text-gray-400 max-w-md">Our AI is actively parsing your document and building your personalized roadmap.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const {
    profile,
    competency_scores: comp,
    job_compatibility: job,
    skill_gap: gap,
    recommendations,
    action_plan,
    roadmap,
    system_health,
    recent_activity
  } = dashboardData;

  const radarData = comp ? [
    { subject: 'Frontend', A: comp.frontend },
    { subject: 'Backend', A: comp.backend },
    { subject: 'Database', A: comp.database },
    { subject: 'AI/ML', A: comp.ai_ml },
    { subject: 'Programming', A: comp.programming },
    { subject: 'Soft Skills', A: comp.soft_skills }
  ] : [];

  const pieData = gap ? gap.missing_skills_prioritized.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.importance);
    if (existing) existing.value += 1;
    else acc.push({ name: curr.importance, value: 1 });
    return acc;
  }, []) : [];
  
  const PIE_COLORS = { 'high': '#ef4444', 'medium': '#f59e0b', 'low': '#3b82f6' };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-8">
      {/* Hero Section / Welcome Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -z-10"></div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, <span className="gradient-text">{profile.name}</span></h1>
          <p className="text-gray-400 text-lg flex items-center gap-2 mb-1">Preferred Role: <span className="text-white font-bold">{profile.preferred_role}</span></p>
          <p className="text-gray-400 text-lg flex items-center gap-2 mb-1">Rule-Based Match: <span className="text-emerald-400 font-bold">{job?.best_match || 'None'} {job?.compatibility_score ? `(${job.compatibility_score}%)` : ''}</span></p>
          
          <div className="mt-4 mb-6">
            <h3 className="text-gray-400 text-lg mb-4 flex items-center gap-2">🤖 AI Career Predictions (XGBoost)</h3>
            {mlPrediction?.predictions ? (
              <div className="max-w-md">
                <ul className="space-y-3">
                  {mlPrediction.predictions.map((pred, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={idx}>
                        <li className={`flex justify-between items-center text-lg ${idx === 0 ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{medals[idx]}</span>
                            <span>{pred.role}</span>
                          </div>
                          <span className={`${idx === 0 ? 'opacity-100' : 'opacity-80'}`}>{pred.confidence}%</span>
                        </li>
                        {idx === 0 && <div className="h-px w-full bg-white/10 my-3"></div>}
                      </div>
                    );
                  })}
                </ul>
                <div className="h-px w-full bg-white/10 mt-4 mb-3"></div>
                <p className="text-xs text-gray-500 italic flex items-start gap-1.5">
                  <span className="not-italic mt-0.5">ℹ️</span> 
                  <span>Generated using the trained XGBoost model based on the student's competency profile.</span>
                </p>
              </div>
            ) : (
              <p className="text-indigo-400 font-bold">Analyzing...</p>
            )}
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm text-gray-300">Last updated: Just now</div>
          </div>
        </div>
        <div className="flex gap-6">
          <CircularProgress percentage={profile.profile_completion} label="Profile" color="stroke-blue-400" />
          <CircularProgress percentage={gap?.career_readiness_score || 0} label="Readiness" color="stroke-emerald-400" />
        </div>
      </motion.div>

      {/* Section 1: Career Overview & Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ProgressCard delay={0.1} title="Overall Competency" value={`${comp?.overall || 0}/100`} description="Aggregated technical mastery score." icon={Star} color="text-amber-400" />
        <ProgressCard delay={0.2} title="Best Job Match" value={job?.best_match || 'N/A'} description={`Compatibility: ${job?.compatibility_score || 0}%`} icon={Target} color="text-indigo-400" />
        <ProgressCard delay={0.3} title="Skill Gap" value={`${gap?.overall_gap_percentage || 0}%`} description="Overall deficit for target role." icon={AlertCircle} color="text-rose-400" />
        
        <DashboardCard delay={0.4} title="System Health" icon={ShieldCheck}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-white font-bold">All Services Online</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {system_health.services.map((svc, i) => (
              <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded-md text-gray-400">{svc}</span>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analytics Area */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Section 8: Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Competency Profile" delay={0.2}>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  <Tooltip contentStyle={{backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)'}} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Skill Gap Breakdown" delay={0.3}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                <span className="text-xs flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> High</span>
                <span className="text-xs flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Medium</span>
                <span className="text-xs flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Low</span>
              </div>
            </ChartCard>
          </div>

          {/* Section 3: Job Compatibility (Extracted from old Dashboard) */}
          <ChartCard title="Top Job Roles (Compatibility %)" delay={0.4}>
             <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[{role: job?.best_match || 'Role', score: job?.compatibility_score || 0}]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                <XAxis type="number" stroke="#9CA3AF" tickLine={false} axisLine={false} domain={[0, 100]} hide />
                <YAxis dataKey="role" type="category" stroke="#9CA3AF" tickLine={false} axisLine={false} width={100} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#111827', border: 'none', borderRadius: '8px'}} />
                <Bar dataKey="score" fill="#10B981" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Section 6 & 7: Action Plan & Resources */}
          {gap && (
            <>
              <DashboardCard title="Weekly Action Plan" icon={Clock} delay={0.5}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-sm">
                        <th className="pb-3 px-4 font-medium">Timeline</th>
                        <th className="pb-3 px-4 font-medium">Task</th>
                        <th className="pb-3 px-4 font-medium">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {action_plan.slice(0, 5).map((plan, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 px-4 text-white font-bold">Week {plan.week}</td>
                          <td className="py-4 px-4 text-gray-200">{plan.task}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${plan.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {plan.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DashboardCard>

              <DashboardCard title="Learning Recommendations" icon={BookOpen} delay={0.6}>
                <div className="space-y-6">
                  {Object.entries(recommendations || {}).slice(0, 2).map(([skill, resources], idx) => (
                    <RecommendationCard key={idx} skill={skill} resources={resources.slice(0, 2)} />
                  ))}
                  <div className="text-center pt-4">
                    <Link to="/skill-gap" className="text-emerald-400 text-sm hover:text-emerald-300 font-bold">View full recommendations &rarr;</Link>
                  </div>
                </div>
              </DashboardCard>
            </>
          )}

        </div>

        {/* Sidebar Analytics */}
        <div className="col-span-1 space-y-6">
          
          {/* Quick Actions */}
          <QuickActionCard delay={0.1} title="Quick Actions" actions={[
            { label: 'Update Profile', to: '/student-profile', icon: User },
            { label: 'Upload Resume', to: '/profile', icon: UploadCloud },
            { label: 'View Competency', to: '/competency-profile', icon: Activity },
            { label: 'Match Jobs', to: '/job-compatibility', icon: Target },
            { label: 'Analyze Skill Gap', to: '/skill-gap', icon: Zap }
          ]} />

          {/* Section 5: Career Roadmap */}
          {roadmap && roadmap.length > 0 && (
            <TimelineCard title="Career Roadmap" stages={roadmap} currentStageIdx={roadmap.findIndex(r => r.status === 'In Progress') !== -1 ? roadmap.findIndex(r => r.status === 'In Progress') : roadmap.length} />
          )}

          {/* Recent Activity Timeline & Notifications */}
          <DashboardCard title="Recent Activity" icon={Bell} delay={0.3}>
            <div className="space-y-4">
              {recent_activity.map((act, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                  <div>
                    <p className="text-white text-sm">{act.action}</p>
                    <p className="text-gray-500 text-xs">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
          
        </div>
      </div>
    </div>
  );
}
