import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, BookOpen, Briefcase, Award, CheckCircle2, Loader2, Plus, Trash2, Github, Linkedin, Code } from 'lucide-react';
import axios from 'axios';

const parseDuration = (dur) => {
  if (!dur) return { start: '', end: '', present: false };
  const parts = dur.split(' to ');
  return {
    start: parts[0] || '',
    end: parts[1] === 'Present' ? '' : (parts[1] || ''),
    present: parts[1] === 'Present'
  };
};

const buildDuration = (start, end, present) => {
  if (!start && !end && !present) return '';
  return `${start || ''} to ${present ? 'Present' : (end || '')}`;
};

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

  const [activeTab, setActiveTab] = useState('basic'); // basic, projects, internships, certifications

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
        setError('Failed to load profile.');
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
      
      // Sanitize numeric fields to prevent FastAPI 422 validation errors
      if (payload.semester === '') payload.semester = null;
      else if (payload.semester !== null) payload.semester = parseInt(payload.semester, 10);
      
      if (payload.cgpa === '') payload.cgpa = null;
      else if (payload.cgpa !== null) payload.cgpa = parseFloat(payload.cgpa);
      
      const response = await axios.put('http://localhost:8000/api/student-profile/me', payload);
      setProfile(response.data);
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      let errorMsg = 'Failed to save profile.';
      const detail = err.response?.data?.detail;
      
      if (detail) {
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          // Handle FastAPI Pydantic validation error array
          errorMsg = 'Validation Error: ' + detail.map(e => `${e.loc.slice(-1)[0]} ${e.msg}`).join(', ');
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

  // Generic handlers for arrays (projects, internships, certifications)
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden"
      >
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold gradient-text">Student Profile</h2>
            <p className="text-gray-400 mt-1">Complete your profile to unlock personalized AI recommendations.</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 min-w-[200px]">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Completion</span>
                <span className="text-primary font-bold">{profile.profile_completion}%</span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${profile.profile_completion}%` }}
                ></div>
              </div>
            </div>
            {profile.profile_completion === 100 && <Award className="text-secondary w-6 h-6" />}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
          <button onClick={() => setActiveTab('basic')} className={`px-6 py-3 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'basic' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
            <User className="w-4 h-4" /> Basic Info & Skills
          </button>
          <button onClick={() => setActiveTab('projects')} className={`px-6 py-3 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'projects' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
            <Code className="w-4 h-4" /> Projects ({profile.projects.length})
          </button>
          <button onClick={() => setActiveTab('internships')} className={`px-6 py-3 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'internships' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
            <Briefcase className="w-4 h-4" /> Internships ({profile.internships.length})
          </button>
          <button onClick={() => setActiveTab('certifications')} className={`px-6 py-3 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'certifications' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
            <BookOpen className="w-4 h-4" /> Certifications ({profile.certifications.length})
          </button>
        </div>

        <div className="min-h-[400px]">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div><label className={labelClass}>Full Name</label><input type="text" name="full_name" value={profile.full_name || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>USN</label><input type="text" name="usn" value={profile.usn || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>Email</label><input type="email" name="email" value={profile.email || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>Department</label><input type="text" name="department" value={profile.department || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>Branch</label><input type="text" name="branch" value={profile.branch || ''} onChange={handleChange} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Semester</label>
                  <select name="semester" value={profile.semester || ''} onChange={handleChange} className={inputClass}>
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>CGPA</label><input type="number" step="0.1" name="cgpa" value={profile.cgpa || ''} onChange={handleChange} className={inputClass} /></div>
              </div>

              <div className="h-px bg-white/10 my-8"></div>
              
              <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Code className="w-5 h-5 text-primary" /> Technical Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2"><label className={labelClass}>Technical Skills (Comma separated)</label><input type="text" name="technical_skills" value={profile.technical_skills || ''} onChange={handleChange} placeholder="React, Python, Machine Learning..." className={inputClass} /></div>
                <div>
                  <label className={labelClass}>DSA Level</label>
                  <select name="dsa_level" value={profile.dsa_level || ''} onChange={handleChange} className={inputClass}>
                    <option value="">Select Level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div><label className={labelClass}>Primary Coding Platform</label><input type="text" name="coding_platform" value={profile.coding_platform || ''} onChange={handleChange} placeholder="LeetCode, HackerRank, Codeforces..." className={inputClass} /></div>
                <div><label className={labelClass}>LeetCode Profile / Score</label><input type="text" name="leetcode_score" value={profile.leetcode_score || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>HackerRank Profile / Score</label><input type="text" name="hackerrank_score" value={profile.hackerrank_score || ''} onChange={handleChange} className={inputClass} /></div>
              </div>

              <div className="h-px bg-white/10 my-8"></div>
              
              <h3 className="text-xl font-bold mb-4 text-white">Links & Career Goals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelClass}><Github className="w-4 h-4 inline mr-1"/> GitHub URL</label><input type="url" name="github_url" value={profile.github_url || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}><Linkedin className="w-4 h-4 inline mr-1"/> LinkedIn URL</label><input type="url" name="linkedin_url" value={profile.linkedin_url || ''} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>Preferred Job Role</label><input type="text" list="job-roles" name="preferred_job_role" value={profile.preferred_job_role || ''} onChange={handleChange} placeholder="Search or select a role..." className={inputClass} autoComplete="off" /></div>
                <div className="col-span-1 md:col-span-2"><label className={labelClass}>Career Interests</label><textarea rows="3" name="career_interests" value={profile.career_interests || ''} onChange={handleChange} placeholder="I am interested in building scalable backend systems..." className={`${inputClass} resize-none`}></textarea></div>
              </div>
            </motion.div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <AnimatePresence>
                {profile.projects.map((proj, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group">
                    <button onClick={() => removeItem('projects', idx)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={labelClass}>Project Name</label><input type="text" value={proj.project_name || ''} onChange={(e) => handleItemChange('projects', idx, 'project_name', e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Technologies Used</label><input type="text" value={proj.technology || ''} onChange={(e) => handleItemChange('projects', idx, 'technology', e.target.value)} className={inputClass} /></div>
                      <div className="col-span-1 md:col-span-2"><label className={labelClass}>GitHub/Live Link</label><input type="text" value={proj.github_link || ''} onChange={(e) => handleItemChange('projects', idx, 'github_link', e.target.value)} className={inputClass} /></div>
                      
                      <div className="col-span-1 md:col-span-2">
                        <label className={labelClass}>Duration</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex-1 w-full">
                            <span className="text-xs text-gray-500 mb-1 block">Start Date</span>
                            <input type="month" value={parseDuration(proj.duration).start} onChange={(e) => handleItemChange('projects', idx, 'duration', buildDuration(e.target.value, parseDuration(proj.duration).end, parseDuration(proj.duration).present))} className={inputClass} />
                          </div>
                          <div className="flex-1 w-full">
                            <span className="text-xs text-gray-500 mb-1 block">End Date</span>
                            <input type="month" value={parseDuration(proj.duration).end} disabled={parseDuration(proj.duration).present} onChange={(e) => handleItemChange('projects', idx, 'duration', buildDuration(parseDuration(proj.duration).start, e.target.value, parseDuration(proj.duration).present))} className={`${inputClass} ${parseDuration(proj.duration).present ? 'opacity-50 cursor-not-allowed' : ''}`} />
                          </div>
                          <div className="flex items-center gap-2 mt-4 sm:mt-0 pt-4">
                            <input type="checkbox" id={`proj-pres-${idx}`} checked={parseDuration(proj.duration).present} onChange={(e) => handleItemChange('projects', idx, 'duration', buildDuration(parseDuration(proj.duration).start, parseDuration(proj.duration).end, e.target.checked))} className="w-5 h-5 accent-primary rounded cursor-pointer" />
                            <label htmlFor={`proj-pres-${idx}`} className="text-sm text-gray-300 cursor-pointer">Currently Working</label>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2"><label className={labelClass}>Description</label><textarea rows="2" value={proj.description || ''} onChange={(e) => handleItemChange('projects', idx, 'description', e.target.value)} className={`${inputClass} resize-none`}></textarea></div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={() => addItem('projects', { project_name: '', technology: '', description: '', github_link: '', duration: '' })} className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl text-gray-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add Project
              </button>
            </motion.div>
          )}

          {/* Internships Tab */}
          {activeTab === 'internships' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <AnimatePresence>
                {profile.internships.map((intern, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group">
                    <button onClick={() => removeItem('internships', idx)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={labelClass}>Company Name</label><input type="text" value={intern.company || ''} onChange={(e) => handleItemChange('internships', idx, 'company', e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Role</label><input type="text" value={intern.role || ''} onChange={(e) => handleItemChange('internships', idx, 'role', e.target.value)} className={inputClass} /></div>
                      
                      <div className="col-span-1 md:col-span-2">
                        <label className={labelClass}>Duration</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex-1 w-full">
                            <span className="text-xs text-gray-500 mb-1 block">Start Date</span>
                            <input type="month" value={parseDuration(intern.duration).start} onChange={(e) => handleItemChange('internships', idx, 'duration', buildDuration(e.target.value, parseDuration(intern.duration).end, parseDuration(intern.duration).present))} className={inputClass} />
                          </div>
                          <div className="flex-1 w-full">
                            <span className="text-xs text-gray-500 mb-1 block">End Date</span>
                            <input type="month" value={parseDuration(intern.duration).end} disabled={parseDuration(intern.duration).present} onChange={(e) => handleItemChange('internships', idx, 'duration', buildDuration(parseDuration(intern.duration).start, e.target.value, parseDuration(intern.duration).present))} className={`${inputClass} ${parseDuration(intern.duration).present ? 'opacity-50 cursor-not-allowed' : ''}`} />
                          </div>
                          <div className="flex items-center gap-2 mt-4 sm:mt-0 pt-4">
                            <input type="checkbox" id={`int-pres-${idx}`} checked={parseDuration(intern.duration).present} onChange={(e) => handleItemChange('internships', idx, 'duration', buildDuration(parseDuration(intern.duration).start, parseDuration(intern.duration).end, e.target.checked))} className="w-5 h-5 accent-primary rounded cursor-pointer" />
                            <label htmlFor={`int-pres-${idx}`} className="text-sm text-gray-300 cursor-pointer">Currently Working</label>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2"><label className={labelClass}>Description & Responsibilities</label><textarea rows="2" value={intern.description || ''} onChange={(e) => handleItemChange('internships', idx, 'description', e.target.value)} className={`${inputClass} resize-none`}></textarea></div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={() => addItem('internships', { company: '', role: '', duration: '', description: '' })} className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl text-gray-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add Internship
              </button>
            </motion.div>
          )}

          {/* Certifications Tab */}
          {activeTab === 'certifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <AnimatePresence>
                {profile.certifications.map((cert, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group">
                    <button onClick={() => removeItem('certifications', idx)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={labelClass}>Certificate Name</label><input type="text" value={cert.certificate_name || ''} onChange={(e) => handleItemChange('certifications', idx, 'certificate_name', e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Platform/Issuer</label><input type="text" value={cert.platform || ''} onChange={(e) => handleItemChange('certifications', idx, 'platform', e.target.value)} placeholder="e.g. Coursera, AWS" className={inputClass} /></div>
                      <div><label className={labelClass}>Completion Date</label><input type="date" value={cert.completion_date || ''} onChange={(e) => handleItemChange('certifications', idx, 'completion_date', e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Certificate URL</label><input type="url" value={cert.certificate_url || ''} onChange={(e) => handleItemChange('certifications', idx, 'certificate_url', e.target.value)} className={inputClass} /></div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={() => addItem('certifications', { certificate_name: '', platform: '', completion_date: '', certificate_url: '' })} className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl text-gray-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add Certification
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            {success && <p className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {success}</p>}
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-indigo-600 disabled:bg-primary/50 text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
