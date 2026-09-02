import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { ChevronRight, Clock, Map, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardCard = ({ children, title, icon: Icon, delay = 0, className = "" }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ delay }} 
    className={`glass p-6 rounded-3xl border border-white/5 shadow-xl ${className}`}
  >
    {title && (
      <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-emerald-400" />} {title}
      </h2>
    )}
    {children}
  </motion.div>
);

export const ProgressCard = ({ title, value, description, icon: Icon, color = "text-emerald-400", delay = 0 }) => (
  <DashboardCard delay={delay} className="flex flex-col">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
    <h3 className="text-gray-300 font-bold mb-1">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </DashboardCard>
);

export const QuickActionCard = ({ title, actions }) => (
  <DashboardCard title={title} className="h-full">
    <div className="flex flex-col gap-3">
      {actions.map((action, idx) => (
        <Link 
          key={idx} 
          to={action.to} 
          className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl flex items-center justify-between text-gray-300 hover:text-white transition-all group"
        >
          <div className="flex items-center gap-3">
            <action.icon className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold">{action.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
      ))}
    </div>
  </DashboardCard>
);

export const ChartCard = ({ title, children, delay = 0, className = "" }) => (
  <DashboardCard title={title} delay={delay} className={`min-h-[300px] flex flex-col ${className}`}>
    <div className="flex-grow w-full relative">
      {children}
    </div>
  </DashboardCard>
);

export const TimelineCard = ({ title, stages, currentStageIdx = 0 }) => (
  <DashboardCard title={title}>
    <div className="relative pl-6 space-y-8 before:absolute before:inset-y-0 before:left-2.5 before:w-0.5 before:bg-white/10">
      {stages.map((stage, idx) => {
        const isCompleted = idx < currentStageIdx;
        const isCurrent = idx === currentStageIdx;
        return (
          <div key={idx} className="relative">
            <div className={`absolute -left-[1.8rem] w-5 h-5 rounded-full border-4 border-gray-900 ${isCompleted ? 'bg-emerald-400' : isCurrent ? 'bg-indigo-500 animate-pulse' : 'bg-gray-600'}`}></div>
            <h4 className="text-white font-bold text-lg mb-1">{stage.title}</h4>
            <p className="text-gray-400 text-sm mb-2">{stage.description}</p>
            <span className={`text-xs font-bold px-2 py-1 rounded-md ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500'}`}>
              {isCompleted ? 'Completed' : isCurrent ? 'Current Stage' : 'Upcoming'}
            </span>
          </div>
        );
      })}
    </div>
  </DashboardCard>
);

export const RecommendationCard = ({ skill, resources }) => (
  <div className="space-y-4">
    <h4 className="text-lg font-bold text-white border-b border-white/10 pb-2">{skill}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {resources.map((res, rIdx) => (
        <a href={res.url} target="_blank" rel="noreferrer" key={rIdx} className="block group">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 hover:border-indigo-500/50 transition-all h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-bl-full -z-10 group-hover:scale-150 transition-transform"></div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{res.type}</span>
              <span className="text-xs text-gray-500">{res.difficulty}</span>
            </div>
            <h5 className="font-bold text-gray-200 mb-1 line-clamp-2">{res.title}</h5>
            <div className="flex justify-between items-center mt-auto pt-4">
              <span className="text-xs text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3" /> {res.provider}</span>
              <span className="text-xs text-emerald-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {res.duration}h</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  </div>
);

export const CircularProgress = ({ percentage, color = "stroke-emerald-400", label }) => {
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
