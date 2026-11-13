import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, BookOpen, Briefcase, Award, CheckCircle2, Loader2, 
  Plus, Trash2, Github, Linkedin, Code, Sparkles, AlertCircle, Save
} from 'lucide-react';
import axios from 'axios';
import { CircularProgress } from '../components/dashboard/DashboardComponents';
import SkillSelector from '../components/SkillSelector';

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({
    full_name: '', usn: '', email: '', department: '', branch: '', semester: '', cgpa: '',
    technical_skills: '', dsa_level: '', coding_platform: '', leetcode_score: '', hackerrank_score: '',
    preferred_job_role: '', career_interests: '', github_url: '', linkedin_url: '',
    profile_completion: 0,
    projects: [], internships: [], certifications: []
  });

  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'projects' | 'internships' | 'certifications'

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/student-profile/me');
      if (response.data) {
        setProfile(response.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load student profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...profile };
      
      // Sanitize numeric fields to prevent FastAPI Pydantic validation errors
      if (payload.semester === '') payload.semester = null;
      else if (payload.semester !== null) payload.semester = parseInt(payload.semester, 10);
      
      if (payload.cgpa === '') payload.cgpa = null;
      else if (payload.cgpa !== null) payload.cgpa = parseFloat(payload.cgpa);
      
      const response = await axios.put('http://localhost:8000/api/student-profile/me', payload);
      setProfile(response.data);
      setSuccess('Profile updated successfully! AI analysis vectors refreshed.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      let errorMsg = 'Failed to save student profile.';
      const detail = err.response?.data?.detail;
      
      if (detail) {
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          errorMsg = 'Validation Error: ' + detail.map(e => `${e.loc.slice(-1)[0]}: ${e.msg}`).join(', ');
        }
      }
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const addItem = (type, defaultItem) => {
    setProfile(prev => ({ ...prev, [type]: [...prev[type], defaultItem] }));
  };

  const removeItem = (type, index) => {
    setProfile(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (type, index, field, value) => {
    setProfile(prev => {
      const newItems = [...prev[type]];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, [type]: newItems };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-6">
        <div className="p-4 rounded-3xl bg-[#7965FF]/10 border border-[#7965FF]/20 mb-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-[#7965FF] animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Loading Student Profile...</h2>
        <p className="text-sm text-[#929BB2]">Retrieving academic credentials, verified skills, and project records.</p>
      </div>
    );
  }

  const labelClass = "block text-xs font-semibold text-[#929BB2] uppercase tracking-wider mb-2";

  return (
    <div className="container mx-auto px-4 py-6 md:px-8 md:py-8 max-w-6xl space-y-8">
      
      {/* Datalist for Job Role options */}
      <datalist id="job-roles">
        <option value="Frontend Developer" />
        <option value="Backend Developer" />
        <option value="Full Stack Developer" />
        <option value="AI Engineer" />
        <option value="Machine Learning Engineer" />
        <option value="Data Scientist" />
        <option value="Data Analyst" />
        <option value="DevOps Engineer" />
        <option value="Cloud Engineer" />
        <option value="Cyber Security Engineer" />
        <option value="Mobile App Developer" />
        <option value="Software Engineer" />
        <option value="Java Developer" />
        <option value="Python Developer" />
      </datalist>

      {/* Header Card with Circular Profile Completion */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7965FF]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7965FF]/15 text-[#9B8AFF] text-xs font-bold border border-[#7965FF]/30">
            <Sparkles className="w-3.5 h-3.5" />
            Candidate Intelligence
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Student Profile
          </h1>
          <p className="text-sm text-[#929BB2] leading-relaxed">
            Manage your academic records, technical competencies, and project portfolio. This data feeds into the Unified Competency model and XGBoost career classifier.
          </p>
        </div>

        {/* Circular Completion Indicator from Backend */}
        <div className="glass p-4 rounded-3xl border border-white/10 flex items-center gap-5 min-w-[220px] shrink-0 shadow-lg">
          <CircularProgress 
            percentage={profile.profile_completion || 0} 
            size={76} 
            strokeWidth={7} 
            color="indigo" 
          />
          <div>
            <span className="text-xs uppercase tracking-wider text-[#929BB2] font-semibold block">
              Profile Completeness
            </span>
            <span className="text-lg font-bold text-white block mt-0.5">
              {profile.profile_completion || 0}% Complete
            </span>
            <span className="text-[11px] text-[#42CFA5] font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {profile.profile_completion >= 80 ? 'Optimal match readiness' : 'More data unlocks better matches'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide border-b border-white/10">
        {[
          { id: 'basic', label: 'Basic Info & Skills', icon: User, count: null },
          { id: 'projects', label: 'Projects', icon: Code, count: profile.projects?.length || 0 },
          { id: 'internships', label: 'Internships', icon: Briefcase, count: profile.internships?.length || 0 },
          { id: 'certifications', label: 'Certifications', icon: BookOpen, count: profile.certifications?.length || 0 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-2xl flex items-center gap-2.5 whitespace-nowrap text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#7965FF] text-white shadow-[0_0_20px_rgba(121,101,255,0.35)] scale-[1.02]'
                  : 'glass text-[#929BB2] hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-[#929BB2]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">
        
        {/* TAB 1: BASIC INFO & SKILLS */}
        {activeTab === 'basic' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Academic Information Card */}
            <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 text-[#7965FF] border border-[#7965FF]/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Academic Details</h3>
                  <p className="text-xs text-[#929BB2]">Core candidate identification and university background</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="full_name" value={profile.full_name || ''} onChange={handleChange} placeholder="e.g. Alex Morgan" className="glass-input" />
                </div>
                <div>
                  <label className={labelClass}>USN / Student ID</label>
                  <input type="text" name="usn" value={profile.usn || ''} onChange={handleChange} placeholder="e.g. 1NH21AI045" className="glass-input" />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" name="email" value={profile.email || ''} onChange={handleChange} placeholder="e.g. alex@university.edu" className="glass-input" />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input type="text" name="department" value={profile.department || ''} onChange={handleChange} placeholder="e.g. Computer Science" className="glass-input" />
                </div>
                <div>
                  <label className={labelClass}>Branch / Specialization</label>
                  <input type="text" name="branch" value={profile.branch || ''} onChange={handleChange} placeholder="e.g. Artificial Intelligence" className="glass-input" />
                </div>
                <div>
                  <label className={labelClass}>Semester</label>
                  <select name="semester" value={profile.semester || ''} onChange={handleChange} className="glass-input cursor-pointer">
                    <option value="" className="bg-[#0D1224] text-white">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <option key={s} value={s} className="bg-[#0D1224] text-white">Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cumulative CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" name="cgpa" value={profile.cgpa || ''} onChange={handleChange} placeholder="e.g. 8.75" className="glass-input" />
                </div>
              </div>
            </div>

            {/* Technical Profile Card */}
            <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-2xl bg-[#42CFA5]/15 text-[#42CFA5] border border-[#42CFA5]/20">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Technical Profile & Skills</h3>
                  <p className="text-xs text-[#929BB2]">Technical competencies, problem-solving proficiency, and coding profiles</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2">
                  <SkillSelector 
                    value={profile.technical_skills || ''} 
                    onChange={(newSkills) => setProfile(prev => ({ ...prev, technical_skills: newSkills }))} 
                    label="Technical Skills"
                    type="skills"
                    placeholder="Search skills (e.g. Python, React, SQL)..."
                    customPlaceholder="Enter a custom skill (e.g. Spring Boot)"
                  />
                  <p className="text-[11px] text-[#929BB2] mt-2">
                    Select your technical proficiencies or add custom skills. These are normalized into standardized competency vectors.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>DSA Level (Data Structures & Algorithms)</label>
                  <select name="dsa_level" value={profile.dsa_level || ''} onChange={handleChange} className="glass-input cursor-pointer">
                    <option value="" className="bg-[#0D1224] text-white">Select DSA Proficiency</option>
                    <option value="Beginner" className="bg-[#0D1224] text-white">Beginner (Arrays, Strings, Linked Lists)</option>
                    <option value="Intermediate" className="bg-[#0D1224] text-white">Intermediate (Trees, Graphs, Recursion, DP Basics)</option>
                    <option value="Advanced" className="bg-[#0D1224] text-white">Advanced (Complex DP, Segment Trees, Advanced Graphs)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Primary Coding Platform</label>
                  <input type="text" name="coding_platform" value={profile.coding_platform || ''} onChange={handleChange} placeholder="LeetCode, Codeforces, HackerRank" className="glass-input" />
                </div>

                <div>
                  <label className={labelClass}>LeetCode Profile / Score</label>
                  <input type="text" name="leetcode_score" value={profile.leetcode_score || ''} onChange={handleChange} placeholder="e.g. 350+ solved, Rating 1680" className="glass-input" />
                </div>

                <div>
                  <label className={labelClass}>HackerRank Profile / Badges</label>
                  <input type="text" name="hackerrank_score" value={profile.hackerrank_score || ''} onChange={handleChange} placeholder="e.g. 5-Star Problem Solving" className="glass-input" />
                </div>
              </div>
            </div>

            {/* Links & Career Goals Card */}
            <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-2xl bg-[#7965FF]/15 text-[#9B8AFF] border border-[#7965FF]/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Career Goals & Portfolio</h3>
                  <p className="text-xs text-[#929BB2]">Target employment trajectory and verified public links</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    <Github className="w-3.5 h-3.5 inline mr-1 text-white" /> GitHub URL
                  </label>
                  <input type="url" name="github_url" value={profile.github_url || ''} onChange={handleChange} placeholder="https://github.com/username" className="glass-input" />
                </div>

                <div>
                  <label className={labelClass}>
                    <Linkedin className="w-3.5 h-3.5 inline mr-1 text-[#42CFA5]" /> LinkedIn Profile URL
                  </label>
                  <input type="url" name="linkedin_url" value={profile.linkedin_url || ''} onChange={handleChange} placeholder="https://linkedin.com/in/username" className="glass-input" />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Preferred Target Job Role</label>
                  <input 
                    type="text" 
                    list="job-roles" 
                    name="preferred_job_role" 
                    value={profile.preferred_job_role || ''} 
                    onChange={handleChange} 
                    placeholder="Search or choose a target role (e.g. Full Stack Developer, AI Engineer)..." 
                    className="glass-input" 
                    autoComplete="off" 
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Career Interests & Aspirations</label>
                  <textarea 
                    rows="3" 
                    name="career_interests" 
                    value={profile.career_interests || ''} 
                    onChange={handleChange} 
                    placeholder="Briefly describe your career aspirations, favorite technical challenges, and industries of interest..." 
                    className="glass-input resize-none" 
                  />
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 2: PROJECTS */}
        {activeTab === 'projects' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Student Projects</h3>
                <p className="text-xs text-[#929BB2]">Hands-on technical implementations contributing to domain mastery</p>
              </div>
              <button 
                onClick={() => addItem('projects', { project_name: '', technology: '', description: '', github_link: '' })}
                className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(121,101,255,0.25)]"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>

            <AnimatePresence>
              {profile.projects?.map((proj, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="glass-card p-6 rounded-3xl relative border border-white/10 group space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-bold text-[#7965FF] bg-[#7965FF]/10 px-2.5 py-1 rounded-full border border-[#7965FF]/20">
                      Project #{idx + 1}
                    </span>
                    <button 
                      onClick={() => removeItem('projects', idx)} 
                      className="text-[#929BB2] hover:text-[#F16C83] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      title="Remove this project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Project Name</label>
                        <input 
                          type="text" 
                          value={proj.project_name || ''} 
                          onChange={(e) => handleItemChange('projects', idx, 'project_name', e.target.value)} 
                          placeholder="e.g. AI Career Copilot" 
                          className="glass-input" 
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Repository or Live URL</label>
                        <input 
                          type="text" 
                          value={proj.github_link || ''} 
                          onChange={(e) => handleItemChange('projects', idx, 'github_link', e.target.value)} 
                          placeholder="https://github.com/username/project" 
                          className="glass-input" 
                        />
                      </div>
                    </div>

                    <div>
                      <SkillSelector 
                        value={proj.technology || ''} 
                        onChange={(newTechs) => handleItemChange('projects', idx, 'technology', newTechs)} 
                        label="Technologies Used"
                        type="technologies"
                        placeholder="Search technologies (e.g. React, Node.js, Docker)..."
                        customPlaceholder="Enter custom technology (e.g. WebSockets, Redis)"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Description & Architecture Highlights</label>
                      <textarea 
                        rows="2" 
                        value={proj.description || ''} 
                        onChange={(e) => handleItemChange('projects', idx, 'description', e.target.value)} 
                        placeholder="Describe system design, algorithms used, and outcomes achieved..." 
                        className="glass-input resize-none" 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {(!profile.projects || profile.projects.length === 0) && (
              <div className="glass-card p-10 rounded-3xl text-center space-y-3 border-dashed border-white/20">
                <Code className="w-10 h-10 text-[#929BB2] mx-auto opacity-60" />
                <h4 className="text-base font-bold text-white">No Projects Added Yet</h4>
                <p className="text-xs text-[#929BB2] max-w-sm mx-auto">
                  Adding projects demonstrates practical skill application and contributes up to 15% towards your Profile Completion.
                </p>
                <button 
                  onClick={() => addItem('projects', { project_name: '', technology: '', description: '', github_link: '' })}
                  className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add First Project
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: INTERNSHIPS */}
        {activeTab === 'internships' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Internships & Professional Experience</h3>
                <p className="text-xs text-[#929BB2]">Industry experience, responsibilities, and team contributions</p>
              </div>
              <button 
                onClick={() => addItem('internships', { company: '', role: '', duration: '', description: '' })}
                className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(121,101,255,0.25)]"
              >
                <Plus className="w-4 h-4" /> Add Internship
              </button>
            </div>

            <AnimatePresence>
              {profile.internships?.map((intern, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="glass-card p-6 rounded-3xl relative border border-white/10 group space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-bold text-[#42CFA5] bg-[#42CFA5]/10 px-2.5 py-1 rounded-full border border-[#42CFA5]/20">
                      Experience #{idx + 1}
                    </span>
                    <button 
                      onClick={() => removeItem('internships', idx)} 
                      className="text-[#929BB2] hover:text-[#F16C83] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      title="Remove this internship"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Company Name</label>
                      <input 
                        type="text" 
                        value={intern.company || ''} 
                        onChange={(e) => handleItemChange('internships', idx, 'company', e.target.value)} 
                        placeholder="e.g. Acme Innovations" 
                        className="glass-input" 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Role Title</label>
                      <input 
                        type="text" 
                        value={intern.role || ''} 
                        onChange={(e) => handleItemChange('internships', idx, 'role', e.target.value)} 
                        placeholder="e.g. Software Engineering Intern" 
                        className="glass-input" 
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className={labelClass}>Responsibilities & Accomplishments</label>
                      <textarea 
                        rows="2" 
                        value={intern.description || ''} 
                        onChange={(e) => handleItemChange('internships', idx, 'description', e.target.value)} 
                        placeholder="Detail the technologies you built with, impact on products, and milestones achieved..." 
                        className="glass-input resize-none" 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {(!profile.internships || profile.internships.length === 0) && (
              <div className="glass-card p-10 rounded-3xl text-center space-y-3 border-dashed border-white/20">
                <Briefcase className="w-10 h-10 text-[#929BB2] mx-auto opacity-60" />
                <h4 className="text-base font-bold text-white">No Internships Added Yet</h4>
                <p className="text-xs text-[#929BB2] max-w-sm mx-auto">
                  Recording corporate experience contributes 10% to your Profile Completion and enhances soft skill evaluation.
                </p>
                <button 
                  onClick={() => addItem('internships', { company: '', role: '', duration: '', description: '' })}
                  className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Internship
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: CERTIFICATIONS */}
        {activeTab === 'certifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Certifications & Credentials</h3>
                <p className="text-xs text-[#929BB2]">Verified external accreditations from Coursera, AWS, Google, etc.</p>
              </div>
              <button 
                onClick={() => addItem('certifications', { certificate_name: '', platform: '' })}
                className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(121,101,255,0.25)]"
              >
                <Plus className="w-4 h-4" /> Add Certification
              </button>
            </div>

            <AnimatePresence>
              {profile.certifications?.map((cert, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="glass-card p-6 rounded-3xl relative border border-white/10 group space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-bold text-[#F5B94C] bg-[#F5B94C]/10 px-2.5 py-1 rounded-full border border-[#F5B94C]/20">
                      Certification #{idx + 1}
                    </span>
                    <button 
                      onClick={() => removeItem('certifications', idx)} 
                      className="text-[#929BB2] hover:text-[#F16C83] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      title="Remove certification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Certificate Name</label>
                      <input 
                        type="text" 
                        value={cert.certificate_name || ''} 
                        onChange={(e) => handleItemChange('certifications', idx, 'certificate_name', e.target.value)} 
                        placeholder="e.g. AWS Certified Solutions Architect" 
                        className="glass-input" 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Platform / Issuing Authority</label>
                      <input 
                        type="text" 
                        value={cert.platform || ''} 
                        onChange={(e) => handleItemChange('certifications', idx, 'platform', e.target.value)} 
                        placeholder="e.g. Amazon Web Services, Coursera, DeepLearning.AI" 
                        className="glass-input" 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {(!profile.certifications || profile.certifications.length === 0) && (
              <div className="glass-card p-10 rounded-3xl text-center space-y-3 border-dashed border-white/20">
                <BookOpen className="w-10 h-10 text-[#929BB2] mx-auto opacity-60" />
                <h4 className="text-base font-bold text-white">No Certifications Recorded</h4>
                <p className="text-xs text-[#929BB2] max-w-sm mx-auto">
                  Adding accredited certifications reinforces specialized competencies and completes your profile.
                </p>
                <button 
                  onClick={() => addItem('certifications', { certificate_name: '', platform: '' })}
                  className="bg-[#7965FF] hover:bg-[#6854EA] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Certification
                </button>
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="glass-card p-4 md:p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-40 shadow-2xl border border-white/10">
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-2 text-[#F16C83] text-xs bg-[#F16C83]/10 px-3 py-1.5 rounded-xl border border-[#F16C83]/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-[#42CFA5] text-xs bg-[#42CFA5]/10 px-3 py-1.5 rounded-xl border border-[#42CFA5]/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {!error && !success && (
            <span className="text-xs text-[#929BB2]">
              All changes are synced directly to PostgreSQL and the AI competency pipeline.
            </span>
          )}
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full sm:w-auto bg-[#7965FF] hover:bg-[#6854EA] disabled:opacity-50 text-white font-bold py-3 px-8 rounded-2xl shadow-[0_0_25px_rgba(121,101,255,0.4)] transition-all flex items-center justify-center gap-2.5 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
        </button>
      </div>

    </div>
  );
}

