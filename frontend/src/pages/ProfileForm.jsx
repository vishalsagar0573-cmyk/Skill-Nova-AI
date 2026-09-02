import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle2, Loader2, BrainCircuit } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ProfileForm() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selected.type)) {
        setError('Please upload a PDF or DOC/DOCX file.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload file. Please try again.');
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
      setError(err.response?.data?.detail || 'Failed to generate profile. Please ensure you have filled out your Student Profile.');
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl min-h-[80vh] flex flex-col justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass p-10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
        
        <h2 className="text-3xl font-bold mb-4 gradient-text text-center">Upload Resume</h2>
        <p className="text-gray-400 text-center mb-8">We will automatically parse your resume and merge it with your Student Profile to build a unified competency map.</p>
        
        <div className="flex flex-col gap-6">
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors group">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {uploadSuccess ? (
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              ) : (
                <UploadCloud className="w-8 h-8 text-primary" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {uploadSuccess ? 'Resume Uploaded & Parsed Successfully!' : 'Upload your Resume'}
            </h3>
            <p className="text-gray-400 text-sm text-center max-w-xs mb-6">
              {file ? file.name : 'Drag and drop your PDF or DOCX file here, or click to browse files from your computer.'}
            </p>
            
            <input 
              type="file" 
              className="hidden" 
              id="resume-upload" 
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
            
            <div className="flex gap-4">
              <label htmlFor="resume-upload" className="bg-white/10 border border-white/10 text-white px-6 py-2 rounded-full font-medium hover:bg-white/20 transition-all cursor-pointer">
                {file ? 'Change File' : 'Browse Files'}
              </label>
              
              {file && !uploadSuccess && (
                <button 
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-primary hover:bg-indigo-600 disabled:bg-primary/50 text-white px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
            </div>
            
            {error && <p className="text-rose-400 text-sm mt-4">{error}</p>}
          </div>

          {uploadSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center pt-4">
              <button 
                type="button" 
                onClick={handleAnalyze}
                disabled={generating}
                className="flex items-center gap-2 bg-secondary hover:bg-teal-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all w-full justify-center text-lg"
              >
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                {generating ? 'Aggregating Data...' : 'Analyze Resume'}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
