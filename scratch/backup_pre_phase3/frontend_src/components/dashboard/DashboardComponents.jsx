import { motion } from 'framer-motion';
import { ChevronRight, Clock, Layers, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Premium Glassmorphism Card Container
 * Supports variant="default" | "ai" (indigo/purple) | "career" (teal/emerald)
 */
export const DashboardCard = ({ 
  children, 
  title, 
  icon: Icon, 
  badge, 
  subtitle, 
  delay = 0, 
  className = "", 
  variant = "default",
  action 
}) => {
  const variantClass = variant === 'ai' 
    ? 'glass-card-ai' 
    : variant === 'career' 
      ? 'glass-card-career' 
      : 'glass-card';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, delay }} 
      className={`rounded-3xl p-6 ${variantClass} ${className}`}
    >
      {(title || Icon || badge || action) && (
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2.5 rounded-2xl ${
                variant === 'ai' 
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' 
                  : variant === 'career' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-white/5 text-slate-300 border border-white/10'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                variant === 'ai'
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  : variant === 'career'
                    ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10'
              }`}>
                {badge}
              </span>
            )}
            {action}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  );
};

/**
 * Metric Card for the 4 Career Intelligence Overview Cards
 */
export const IntelligenceCard = ({
  title,
  subtitle,
  value,
  secondaryValue,
  icon: Icon,
  variant = "default", // 'ai' | 'career' | 'default'
  algorithmTag,
  algorithmDesc,
  delay = 0,
  children,
  actionLink,
  actionText = "View details"
}) => {
  const isAI = variant === 'ai';
  const isCareer = variant === 'career';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group ${
        isAI ? 'glass-card-ai' : isCareer ? 'glass-card-career' : 'glass-card'
      }`}
    >
      {/* Background ambient glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -z-10 transition-opacity ${
        isAI ? 'bg-indigo-600/15 group-hover:opacity-100 opacity-60' : isCareer ? 'bg-emerald-500/15 group-hover:opacity-100 opacity-60' : 'bg-blue-500/10'
      }`} />

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              isAI 
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' 
                : isCareer 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {algorithmTag && (
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
              isAI 
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' 
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}>
              {algorithmTag}
            </span>
          )}
        </div>

        {/* Value Section */}
        <div className="mt-3 mb-3">
          {children ? (
            children
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold tracking-tight ${
                  isAI ? 'text-indigo-300' : isCareer ? 'text-emerald-300' : 'text-white'
                }`}>
                  {value}
                </span>
                {secondaryValue && (
                  <span className="text-sm font-semibold text-slate-400">{secondaryValue}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {(actionLink || algorithmDesc) && (
        <div className="pt-3 border-t border-white/5 mt-auto">
          {algorithmDesc && (
            <p className="text-xs text-slate-400 leading-relaxed flex items-start gap-1.5 mb-2">
              <span className="shrink-0 text-slate-500 mt-0.5">•</span>
              <span>{algorithmDesc}</span>
            </p>
          )}
          {actionLink && (
            <Link 
              to={actionLink} 
              className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                isAI 
                  ? 'text-indigo-400 hover:text-indigo-300' 
                  : isCareer 
                    ? 'text-emerald-400 hover:text-emerald-300' 
                    : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              {actionText} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Animated High-Fidelity Circular Progress Indicator
 */
export const CircularProgress = ({ 
  percentage = 0, 
  size = 110, 
  strokeWidth = 8, 
  color = "emerald", // 'emerald' | 'indigo' | 'blue' | 'rose'
  label,
  subtitle,
  animate = true
}) => {
  const validPct = isNaN(percentage) || percentage === null || percentage === undefined ? 0 : Math.min(Math.max(percentage, 0), 100);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  const colorStyles = {
    emerald: {
      stroke: "#10B981",
      glow: "rgba(16, 185, 129, 0.4)",
      text: "text-emerald-400"
    },
    indigo: {
      stroke: "#818CF8",
      glow: "rgba(129, 140, 248, 0.4)",
      text: "text-indigo-400"
    },
    blue: {
      stroke: "#38BDF8",
      glow: "rgba(56, 189, 248, 0.4)",
      text: "text-sky-400"
    },
    rose: {
      stroke: "#F43F5E",
      glow: "rgba(244, 63, 94, 0.4)",
      text: "text-rose-400"
    }
  };

  const currentStyle = colorStyles[color] || colorStyles.emerald;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: animate ? 1.2 : 0, ease: "easeOut" }}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={currentStyle.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              filter: `drop-shadow(0 0 6px ${currentStyle.glow})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-white tracking-tight">
            {Math.round(validPct)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-semibold text-slate-300 mt-2 tracking-wide uppercase">
          {label}
        </span>
      )}
      {subtitle && (
        <span className="text-[11px] text-slate-400 mt-0.5 text-center">
          {subtitle}
        </span>
      )}
    </div>
  );
};

/**
 * Chart Container with standard header, subtitle, and responsive wrapper
 */
export const ChartCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  delay = 0, 
  className = "",
  headerRight 
}) => (
  <DashboardCard 
    title={title} 
    subtitle={subtitle} 
    icon={Icon} 
    delay={delay} 
    className={`min-h-[340px] flex flex-col ${className}`}
    action={headerRight}
  >
    <div className="flex-grow w-full relative pt-2">
      {children}
    </div>
  </DashboardCard>
);

/**
 * Quick Action Card for navigation to dedicated sub-pages
 */
export const QuickActionCard = ({ title = "Platform Actions", actions = [] }) => (
  <DashboardCard title={title} className="h-full">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
      {actions.map((action, idx) => {
        const IconComponent = action.icon;
        return (
          <Link
            key={idx}
            to={action.to}
            className="glass-pill p-3.5 rounded-2xl flex items-center justify-between text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all">
                <IconComponent className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm block">{action.label}</span>
                {action.description && (
                  <span className="text-[11px] text-slate-500 block">{action.description}</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        );
      })}
    </div>
  </DashboardCard>
);

/**
 * Connected Career Roadmap Timeline (Section 5)
 */
export const RoadmapTimeline = ({ stages = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
      {stages.map((stage, idx) => {
        const isCompleted = stage.status === 'Completed';
        const isInProgress = stage.status === 'In Progress';
        const stageNum = stage.stage || idx + 1;

        return (
          <div 
            key={idx} 
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isInProgress 
                ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                : isCompleted 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'glass border-white/5 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                  isInProgress 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse' 
                    : isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-white/5 text-slate-400 border-white/10'
                }`}>
                  Stage {stageNum}
                </span>

                <span className={`text-xs font-bold ${
                  isInProgress ? 'text-indigo-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {stage.status || 'Pending'}
                </span>
              </div>

              <h4 className="text-base font-bold text-white mb-2 leading-snug">
                {stage.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {stage.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  isInProgress ? 'bg-indigo-400 animate-ping' : isCompleted ? 'bg-emerald-400' : 'bg-slate-600'
                }`} />
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  {isCompleted ? 'Achieved' : isInProgress ? 'Active Focus' : 'Upcoming'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Reusable ProgressCard for backward compatibility
 */
export const ProgressCard = ({ title, value, description, icon: Icon, color = "text-emerald-400", delay = 0 }) => (
  <DashboardCard delay={delay} className="flex flex-col">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
    <h3 className="text-slate-300 font-bold mb-1">{title}</h3>
    <p className="text-slate-500 text-xs leading-relaxed">{description}</p>
  </DashboardCard>
);

/**
 * TimelineCard for backward compatibility
 */
export const TimelineCard = ({ title, stages = [], currentStageIdx = 0 }) => (
  <DashboardCard title={title}>
    <RoadmapTimeline stages={stages} />
  </DashboardCard>
);

/**
 * RecommendationCard for Section 4 Personalized Learning
 */
export const RecommendationCard = ({ skill, resources = [] }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between border-b border-white/10 pb-2">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
        Target Skill: <span className="text-indigo-300">{skill}</span>
      </h4>
      <span className="text-xs text-slate-500">{resources.length} verified resources</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {resources.map((res, rIdx) => (
        <a 
          href={res.url} 
          target="_blank" 
          rel="noreferrer" 
          key={rIdx} 
          className="block group"
        >
          <div className="glass p-4 rounded-2xl hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all h-full flex flex-col justify-between border border-white/5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  {res.type || 'Course'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">{res.difficulty || 'All levels'}</span>
              </div>
              <h5 className="font-bold text-sm text-slate-200 group-hover:text-white line-clamp-2 transition-colors mb-2">
                {res.title}
              </h5>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-slate-400" /> {res.provider || 'Web'}</span>
              {res.duration && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {res.duration}h
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  </div>
);

