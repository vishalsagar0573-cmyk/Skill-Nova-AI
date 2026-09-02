import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, AlertCircle, BookOpen, Clock, Calendar, CheckCircle2, ChevronRight, Activity, Zap, PlayCircle, Map, Layers } from 'lucide-react';
import axios from 'axios';

export default function SkillGap() {
  const [skillGap, setSkillGap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSkillGap();
  }, []);

  const fetchSkillGap = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/skill-gap/me');
      if (response.data) {
        setSkillGap(response.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load skill gap data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8000/api/skill-gap/calculate');
      setSkillGap(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze skill gap. Ensure Competency Profile and Job Compatibility are generated.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Circular Progress Component
  const CircularProgress = ({ percentage, color, label }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 flex items-center justify-center mb-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r={radius} className="stroke-white/10" strokeWidth="8" fill="none" />
            <motion.circle 
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="64" cy="64" r={radius} 
              className={color} strokeWidth="8" fill="none" 
              strokeLinecap="round" strokeDasharray={circumference}
            />
          </svg>
          <div className="absolute text-3xl font-black text-white">{Math.round(percentage)}%</div>
        </div>
        <span className="text-gray-300 font-medium uppercase tracking-wider text-xs">{label}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!skillGap) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-[80vh] flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="glass p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden max-w-2xl w-full"
        >
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -z-10"></div>
          <Activity className="w-20 h-20 text-emerald-400 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4 gradient-text">Skill Gap Engine</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Identify missing competencies for your target role and generate a personalized learning roadmap with curated resources.
          </p>
          
          {error && <p className="text-rose-400 mb-6 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</p>}
          
          <button 
            onClick={handleAnalyze}
            disabled={analyzing}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-3 mx-auto text-lg"
          >
            {analyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6" />}
            {analyzing ? 'Generating Roadmap...' : 'Analyze Skill Gap'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
            <Activity className="w-10 h-10 text-emerald-400" /> Skill Gap Analysis
          </h1>
          <p className="text-gray-400 text-lg flex items-center gap-2">
            Targeting: <span className="text-white font-bold">{skillGap.target_role}</span>
          </p>
        </div>
        
        <button 
          onClick={handleAnalyze}
          disabled={analyzing}
          className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
          {analyzing ? 'Recalculating...' : 'Recalculate Gap'}
        </button>
      </div>

      {error && <p className="text-rose-400 mb-6 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 max-w-3xl">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Top KPIs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl flex justify-around items-center col-span-1 lg:col-span-2">
          <CircularProgress percentage={skillGap.career_readiness_score} color="stroke-emerald-400" label="Career Readiness" />
          <CircularProgress percentage={skillGap.overall_gap_percentage} color="stroke-rose-400" label="Skill Gap" />
        </motion.div>

        {/* Missing Skills Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl col-span-1 lg:col-span-2">
          <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-400" /> Prioritized Missing Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skillGap.missing_skills_json?.map((item, idx) => (
              <div key={idx} className={`border px-3 py-1.5 rounded-xl text-sm flex items-center gap-2 
                ${item.importance === 'high' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 
                  item.importance === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                  'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                <Zap className="w-3.5 h-3.5" />
                <span className="font-bold">{item.skill}</span>
              </div>
            ))}
            {(!skillGap.missing_skills_json || skillGap.missing_skills_json.length === 0) && (
              <p className="text-gray-500">No major gaps identified.</p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Career Roadmap */}
        <div className="col-span-1 space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Map className="w-5 h-5 text-indigo-400" /> Career Roadmap</h3>
            <div className="relative pl-6 space-y-8 before:absolute before:inset-y-0 before:left-2.5 before:w-0.5 before:bg-white/10">
              {skillGap.career_roadmap_json?.map((stage, idx) => (
                <div key={idx} className="relative">
                  <div className={`absolute -left-[1.8rem] w-5 h-5 rounded-full border-4 border-gray-900 ${stage.status === 'Completed' ? 'bg-emerald-400' : stage.status === 'In Progress' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-600'}`}></div>
                  <h4 className="text-white font-bold text-lg mb-1">Stage {stage.stage}: {stage.title}</h4>
                  <p className="text-gray-400 text-sm mb-2">{stage.description}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${stage.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : stage.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500'}`}>{stage.status}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Col - Action Plan & Resources */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400" /> Structured Action Plan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-sm">
                    <th className="pb-3 px-4 font-medium">Timeline</th>
                    <th className="pb-3 px-4 font-medium">Task</th>
                    <th className="pb-3 px-4 font-medium">Priority</th>
                    <th className="pb-3 px-4 font-medium">Est. Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {skillGap.action_plan_json?.map((plan, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-4 text-white font-bold">Week {plan.week}</td>
                      <td className="py-4 px-4">
                        <div className="text-gray-200">{plan.task}</div>
                        {plan.resource_url && (
                          <a href={plan.resource_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View Resource <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider
                          ${plan.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : 
                            plan.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 
                            'bg-blue-500/20 text-blue-400'}`}>
                          {plan.priority}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {plan.estimated_hours}h</td>
                    </tr>
                  ))}
                  {(!skillGap.action_plan_json || skillGap.action_plan_json.length === 0) && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500">No action plan generated. You're fully ready!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-400" /> Recommended Learning Resources</h3>
            <div className="space-y-8">
              {Object.entries(skillGap.recommended_resources_json || {}).map(([skill, resources], idx) => (
                <div key={idx}>
                  <h4 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">{skill}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map((res, rIdx) => (
                      <a href={res.url} target="_blank" rel="noreferrer" key={rIdx} className="block group">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 hover:border-indigo-500/50 transition-all h-full flex flex-col relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-bl-full -z-10 group-hover:scale-150 transition-transform"></div>
                          
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{res.type}</span>
                            <span className="text-xs text-gray-500">{res.difficulty}</span>
                          </div>
                          
                          <h5 className="font-bold text-gray-200 mb-1 line-clamp-2">{res.title}</h5>
                          <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-grow">{res.description}</p>
                          
                          <div className="flex justify-between items-center mt-auto">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3" /> {res.provider}</span>
                            <span className="text-xs text-emerald-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {res.duration}h</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(skillGap.recommended_resources_json || {}).length === 0 && (
                <p className="text-gray-500 italic">No specific resources needed.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
