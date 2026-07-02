import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UploadCloud, CheckCircle2, Loader2, Target, TrendingUp, AlertCircle, BookOpen, Briefcase, FileText } from 'lucide-react';
import { uploadResume, getJobMatches, getCourseRecommendations } from '../services/api';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle'); // idle, uploading, analyzing, complete
  const [error, setError] = useState('');
  
  const [parsedData, setParsedData] = useState(null);
  const [jobMatches, setJobMatches] = useState([]);
  const [courses, setCourses] = useState([]);

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
      
      // 1. Upload & Parse Resume via FastAPI
      const uploadRes = await uploadResume(file);
      setParsedData(uploadRes.parsed_data);
      
      setStep('analyzing');
      
      // 2. Fetch Job Matches using ML Service (Mocking user ID 1)
      const matches = await getJobMatches(1);
      setJobMatches(matches);
      
      // 3. Extract unique missing skills to feed into Course Recommender
      let missingSkillsSet = new Set();
      matches.forEach(job => {
        job.missing_skills.forEach(skill => missingSkillsSet.add(skill));
      });
      const missingSkillsArray = Array.from(missingSkillsSet);
      
      // 4. Fetch AI Course Recommendations
      if (missingSkillsArray.length > 0) {
        const recs = await getCourseRecommendations(missingSkillsArray);
        setCourses(recs);
      }
      
      setStep('complete');
    } catch (err) {
      console.error(err);
      setError('An error occurred during AI processing. Please ensure the backend is running.');
      setStep('idle');
    }
  };

  // UPLOAD & PROCESSING STATE UI
  if (step === 'idle' || step === 'uploading' || step === 'analyzing') {
    return (
      <div className="container mx-auto p-8 max-w-4xl min-h-[80vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass p-12 rounded-3xl border border-white/5 shadow-2xl text-center w-full relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
          
          <h2 className="text-3xl font-bold mb-4 gradient-text">SkillNova AI Analyzer</h2>
          <p className="text-gray-400 mb-10">Upload your PDF resume to instantly map your career trajectory.</p>
          
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors group relative">
            {step === 'idle' ? (
              <>
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Upload your Resume</h3>
                <p className="text-gray-400 text-sm mb-8 max-w-sm">{file ? file.name : 'Drag and drop your PDF file here, or click to browse files from your computer.'}</p>
                
                <input type="file" className="hidden" id="resume-upload" accept=".pdf" onChange={handleFileChange} />
                
                <div className="flex gap-4">
                  <label htmlFor="resume-upload" className="bg-white/10 border border-white/10 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/20 transition-all cursor-pointer shadow-lg">
                    {file ? 'Change File' : 'Browse Files'}
                  </label>
                  
                  {file && (
                    <button onClick={handleProcess} className="bg-primary hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center gap-2">
                      Analyze Profile
                    </button>
                  )}
                </div>
                {error && <p className="text-rose-400 mt-6 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">{error}</p>}
              </>
            ) : (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">
                  {step === 'uploading' ? 'Extracting NLP Entities...' : 'Calculating ML Vector Matches...'}
                </h3>
                <p className="text-gray-400 max-w-md">Our AI is actively parsing your document, cross-referencing industry skill sets, and building your personalized roadmap.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // COMPLETE STATE - FULL DASHBOARD RENDER
  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold mb-3">AI Analysis <span className="gradient-text">Complete</span></h1>
          <p className="text-gray-400 text-lg">Here is your extracted profile and career compatibility matrix.</p>
        </div>
        <button onClick={() => {setStep('idle'); setFile(null)}} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
           <FileText className="w-4 h-4" /> Analyze Another Resume
        </button>
      </motion.div>

      {/* NLP Parsed Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}} className="glass p-8 rounded-3xl border border-white/5 shadow-2xl mb-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-3"><Briefcase className="text-primary" /> Profile Extracted via NLP</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 text-sm mb-3 uppercase tracking-wider font-bold">Identified Technical Skills</h3>
            <p className="text-white font-medium leading-relaxed">{parsedData?.skills || 'None detected'}</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 text-sm mb-3 uppercase tracking-wider font-bold">Education & Experience</h3>
            <p className="text-white font-medium mb-3 pb-3 border-b border-white/10">{parsedData?.education || 'None detected'}</p>
            <p className="text-gray-300 text-sm italic">{parsedData?.experience || 'No experience extracted'}</p>
          </div>
        </div>
      </motion.div>

      {/* Job Match Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{delay: 0.2}} className="glass p-8 rounded-3xl col-span-2 border border-white/5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-8 flex items-center gap-3"><TrendingUp className="text-secondary" /> Role Compatibility Matrix (%)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobMatches} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="job_role" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px'}} />
                <Bar dataKey="match_percentage" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} barSize={60} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Match Target Card */}
        {jobMatches.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{delay: 0.3}} className="glass p-8 rounded-3xl flex flex-col justify-center items-center text-center relative overflow-hidden group shadow-2xl border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 z-0 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10 w-full">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg text-gray-400 mb-2 font-medium">Top Career Match</h2>
              <div className="text-2xl font-bold text-white mb-6">{jobMatches[0].job_role}</div>
              
              <div className="relative w-36 h-36 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                  <circle cx="72" cy="72" r="64" stroke="url(#circleGradient)" strokeWidth="10" fill="transparent" strokeDasharray="402.12" strokeDashoffset={402.12 - (402.12 * jobMatches[0].match_percentage) / 100} className="transition-all duration-1500 ease-out" />
                  <defs>
                    <linearGradient id="circleGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#4F46E5" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-white">{Math.round(jobMatches[0].match_percentage)}<span className="text-xl text-gray-400">%</span></span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Skills & Courses Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.4}} className="glass p-8 rounded-3xl border border-white/5 shadow-2xl">
          {jobMatches.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-emerald-400"><CheckCircle2 className="w-6 h-6" /> Acquired Skills (Top Match)</h2>
              <div className="flex flex-wrap gap-3 mb-10">
                {jobMatches[0].matching_skills.length > 0 ? jobMatches[0].matching_skills.map((skill, i) => (
                  <span key={i} className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
                    {skill}
                  </span>
                )) : <span className="text-gray-500 italic">No matching skills detected.</span>}
              </div>

              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-rose-400"><AlertCircle className="w-6 h-6" /> Missing Skills to Learn</h2>
              <div className="flex flex-wrap gap-3">
                {jobMatches[0].missing_skills.length > 0 ? jobMatches[0].missing_skills.map((skill, i) => (
                  <span key={i} className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
                    {skill}
                  </span>
                )) : <span className="text-gray-500 italic">No missing skills! You're perfectly aligned.</span>}
              </div>
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.5}} className="glass p-8 rounded-3xl border border-white/5 shadow-2xl overflow-y-auto max-h-[500px] custom-scrollbar">
          <h2 className="text-xl font-semibold mb-8 flex items-center gap-3 text-blue-400"><BookOpen className="w-6 h-6" /> Recommended AI Roadmap</h2>
          <div className="space-y-8">
            {courses.length === 0 ? (
              <div className="bg-white/5 p-6 rounded-2xl text-center border border-white/5">
                <p className="text-gray-400">You have all the required skills for your top matches!</p>
              </div>
            ) : (
              courses.map((rec, idx) => (
                <div key={idx} className="relative">
                  <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Learn <span className="text-white">{rec.missing_skill}</span>
                  </h3>
                  <div className="space-y-4 pl-4 border-l border-white/10">
                    {rec.recommended_courses.map((course, i) => (
                      <a href={course.course_link} target="_blank" rel="noreferrer" key={i} className="block p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group shadow-lg hover:shadow-primary/5">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-white mb-1 group-hover:text-primary transition-colors text-lg">{course.course_name}</div>
                            <div className="text-sm text-gray-400 flex items-center gap-2">
                              <span>{course.platform}</span>
                            </div>
                          </div>
                          <div className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider
                            ${course.difficulty_level.toLowerCase() === 'beginner' ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' : 
                              course.difficulty_level.toLowerCase() === 'advanced' ? 'text-rose-300 bg-rose-400/10 border-rose-400/20' : 
                              'text-blue-300 bg-blue-400/10 border-blue-400/20'}`}>
                            {course.difficulty_level}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
