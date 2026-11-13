import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Plus, X, Sparkles, AlertCircle, Layers } from 'lucide-react';

export const SKILL_CATEGORIES = {
  Programming: [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'C#', 
    'R', 'Go', 'PHP', 'Ruby', 'Kotlin', 'Swift'
  ],
  Frontend: [
    'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Next.js', 
    'Bootstrap', 'Tailwind CSS'
  ],
  Backend: [
    'Node.js', 'Express.js', 'FastAPI', 'Django', 'Flask', 
    'Spring Boot', 'ASP.NET', 'REST APIs', 'GraphQL'
  ],
  Database: [
    'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Oracle', 
    'Redis', 'Firebase'
  ],
  'AI / ML': [
    'Machine Learning', 'Deep Learning', 'Artificial Intelligence', 
    'Natural Language Processing', 'Computer Vision', 'TensorFlow', 
    'PyTorch', 'Scikit-learn', 'Generative AI', 'Large Language Models'
  ],
  Cloud: [
    'AWS', 'Microsoft Azure', 'Google Cloud', 'Docker', 
    'Kubernetes', 'CI/CD'
  ],
  Tools: [
    'Git', 'GitHub', 'Linux', 'Postman', 'VS Code', 
    'Jupyter Notebook', 'Figma', 'Power BI', 'Tableau'
  ],
};

const ALL_PREDEFINED_SKILLS = Object.values(SKILL_CATEGORIES).flat();

/**
 * SkillSelector Component
 * Provides an interactive, searchable, category-filtered multi-select skill & technology picker.
 *
 * @param {string} value - Comma-separated string of selected skills (e.g. "Python, React, FastAPI")
 * @param {function} onChange - Callback triggered with updated comma-separated string
 * @param {string} label - Input label (e.g. "Technical Skills" or "Technologies Used")
 * @param {string} type - 'skills' | 'technologies' (controls text context)
 * @param {string} placeholder - Search bar placeholder
 * @param {string} customPlaceholder - Custom skill input placeholder
 */
export default function SkillSelector({
  value = '',
  onChange,
  label = 'Technical Skills',
  type = 'skills',
  placeholder = 'Search skills (e.g. Python, React, SQL)...',
  customPlaceholder = 'Enter a custom skill (e.g. Spring Boot)'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customInput, setCustomInput] = useState('');
  const [inputError, setInputError] = useState('');

  // Parse comma-separated value into array of unique trimmed strings
  const selectedSkills = useMemo(() => {
    if (!value) return [];
    const rawList = Array.isArray(value) ? value : value.split(',');
    
    // Deduplicate case-insensitively while preserving first occurrence casing
    const seen = new Set();
    const result = [];
    for (const item of rawList) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    }
    return result;
  }, [value]);

  // Categories list including 'All'
  const categories = useMemo(() => ['All', ...Object.keys(SKILL_CATEGORIES)], []);

  // Helper to check if a skill is selected (case-insensitive)
  const isSelected = (skillName) => {
    if (!skillName) return false;
    const target = skillName.trim().toLowerCase();
    return selectedSkills.some(s => s.trim().toLowerCase() === target);
  };

  // Filter available skills based on active category and search query
  const displayedSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // When searching, search across ALL skills (predefined + custom)
    if (query) {
      // Collect all candidate skills
      const allKnown = [...ALL_PREDEFINED_SKILLS, ...selectedSkills];
      const seen = new Set();
      const searchMatches = [];
      
      for (const s of allKnown) {
        const lower = s.toLowerCase();
        if (lower.includes(query) && !seen.has(lower)) {
          seen.add(lower);
          searchMatches.push(s);
        }
      }
      return searchMatches;
    }

    // When not searching, filter by active category
    if (activeCategory === 'All') {
      return Array.from(new Set(ALL_PREDEFINED_SKILLS));
    }
    return SKILL_CATEGORIES[activeCategory] || [];
  }, [activeCategory, searchQuery, selectedSkills]);

  // Toggle selection of a skill
  const handleToggleSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;

    let updated;
    if (isSelected(trimmed)) {
      // Deselect (remove)
      updated = selectedSkills.filter(
        s => s.trim().toLowerCase() !== trimmed.toLowerCase()
      );
    } else {
      // Select (add)
      // Check if canonical casing exists in predefined list
      const canonicalMatch = ALL_PREDEFINED_SKILLS.find(
        s => s.toLowerCase() === trimmed.toLowerCase()
      );
      const skillToAdd = canonicalMatch || trimmed;
      updated = [...selectedSkills, skillToAdd];
    }

    if (onChange) {
      onChange(updated.join(', '));
    }
  };

  // Remove a selected skill
  const handleRemoveSkill = (skillToRemove) => {
    const updated = selectedSkills.filter(
      s => s.trim().toLowerCase() !== skillToRemove.trim().toLowerCase()
    );
    if (onChange) {
      onChange(updated.join(', '));
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    if (onChange) {
      onChange('');
    }
  };

  // Add custom skill
  const handleAddCustomSkill = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = customInput.trim();

    if (!trimmed) {
      setInputError(`Please enter a ${type === 'skills' ? 'skill' : 'technology'} name.`);
      setTimeout(() => setInputError(''), 2500);
      return;
    }

    // Check for duplicate (case-insensitive)
    if (isSelected(trimmed)) {
      setInputError(`"${trimmed}" is already selected.`);
      setTimeout(() => setInputError(''), 2500);
      return;
    }

    // Check if it exists in predefined list with canonical casing
    const predefinedMatch = ALL_PREDEFINED_SKILLS.find(
      s => s.toLowerCase() === trimmed.toLowerCase()
    );
    const skillToAdd = predefinedMatch || trimmed;

    const updated = [...selectedSkills, skillToAdd];
    if (onChange) {
      onChange(updated.join(', '));
    }

    setCustomInput('');
    setInputError('');
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddCustomSkill();
    }
  };

  return (
    <div className="space-y-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 md:p-5">
      {/* Label and Selected Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#7965FF]" />
          <label className="text-xs font-bold text-slate-900 dark:text-white tracking-wide uppercase">
            {label}
          </label>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#7965FF]/15 text-[#9B8AFF] border border-[#7965FF]/30">
            {selectedSkills.length} selected
          </span>
          {selectedSkills.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-[#F16C83] transition-colors"
              title="Clear all selections"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-[#0D1224]/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#929BB2]/60 focus:border-[#7965FF] focus:outline-none focus:ring-1 focus:ring-[#7965FF]/40 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5 rounded-md"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
        {categories.map((cat) => {
          const isActive = activeCategory === cat && !searchQuery.trim();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                if (searchQuery) setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all text-xs flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#7965FF] text-white shadow-[0_0_12px_rgba(121,101,255,0.35)] font-semibold scale-[1.02]'
                  : 'bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-200 dark:border-white/5'
              }`}
            >
              <span>{cat}</span>
              {cat !== 'All' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-600 dark:text-slate-400'
                }`}>
                  {SKILL_CATEGORIES[cat]?.length || 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Available Skill Chips Grid/Flex */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080B18]/60 border border-slate-200 dark:border-white/5 min-h-[110px] max-h-[210px] overflow-y-auto">
        {searchQuery.trim() && (
          <div className="mb-2.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/5 pb-1.5">
            <span>Search results across all categories ({displayedSkills.length})</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#7965FF] hover:underline"
            >
              Reset search
            </button>
          </div>
        )}

        {displayedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {displayedSkills.map((skill) => {
              const selected = isSelected(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleToggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    selected
                      ? 'bg-gradient-to-r from-[#7965FF] to-[#6854EA] text-white border border-[#7965FF] shadow-[0_0_12px_rgba(121,101,255,0.35)] font-semibold scale-[1.02]'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-200 dark:border-white/10 hover:border-[#7965FF]/40 hover:bg-[#7965FF]/10 hover:text-white'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                  <span>{skill}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400 italic mb-1">
              No matching {type} found for "{searchQuery}".
            </p>
            <p className="text-[11px] text-[#9B8AFF]">
              You can add it below as a custom {type === 'skills' ? 'skill' : 'technology'}.
            </p>
          </div>
        )}
      </div>

      {/* Custom Skill Input */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              if (inputError) setInputError('');
            }}
            onKeyDown={handleCustomKeyDown}
            placeholder={customPlaceholder}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#0D1224]/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#929BB2]/60 focus:border-[#7965FF] focus:outline-none focus:ring-1 focus:ring-[#7965FF]/40 transition-all"
          />
          <button
            type="button"
            onClick={handleAddCustomSkill}
            className="px-4 py-2 rounded-xl bg-[#7965FF]/20 hover:bg-[#7965FF]/30 text-[#7965FF] dark:text-[#9B8AFF] hover:text-[#6854EA] dark:hover:text-white border border-[#7965FF]/30 font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Inline Error Message */}
        <AnimatePresence>
          {inputError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-[#F16C83] flex items-center gap-1 pl-1"
            >
              <AlertCircle className="w-3 h-3" />
              <span>{inputError}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Skills Section */}
      <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#42CFA5]" />
            Selected {type === 'skills' ? 'Skills' : 'Technologies'} ({selectedSkills.length})
          </span>
          {selectedSkills.length > 0 && (
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Click chip X to remove</span>
          )}
        </div>

        {selectedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0D1224]/50 border border-slate-200 dark:border-white/5 min-h-[50px] max-h-[140px] overflow-y-auto">
            {selectedSkills.map((skill, idx) => (
              <span
                key={`${skill}-${idx}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#7965FF]/15 dark:bg-gradient-to-r dark:from-[#7965FF]/25 dark:to-[#6854EA]/20 border border-[#7965FF]/40 text-slate-900 dark:text-white text-xs font-semibold shadow-[0_0_10px_rgba(121,101,255,0.15)] group"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 text-[#7965FF] dark:text-[#9B8AFF] hover:text-[#6854EA] dark:hover:text-white transition-colors"
                  title={`Remove ${skill}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              No {type} selected yet. Select from the categories above or enter custom {type}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

