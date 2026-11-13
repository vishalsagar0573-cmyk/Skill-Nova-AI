import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { InputField, PasswordField, AuthButton } from '../components/auth/AuthComponents';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', formData);
      const { access_token } = res.data;
      
      // Fetch user data after getting token
      const userRes = await axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      login(access_token, userRes.data);
      window.location.href = '/'; // Hard redirect to clear out any old state and hit App.jsx properly
    } catch (err) {
      if (err.response && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("An error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
        className="glass p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-10"></div>
        <h2 className="text-3xl font-bold mb-2 text-white">Welcome back</h2>
        <p className="text-gray-400 mb-8">Login to your SkillNova AI account</p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <InputField 
            label="Email Address" 
            icon={Mail} 
            type="email" 
            placeholder="you@example.com" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <PasswordField 
            label="Password" 
            icon={Lock} 
            placeholder="••••••••" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          
          <div className="flex justify-between items-center mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500/50" />
              <span className="text-sm text-gray-400">Remember me</span>
            </label>
            <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300">Forgot password?</a>
          </div>

          <AuthButton type="submit" loading={loading}>Login</AuthButton>
        </form>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Don't have an account? <Link to="/register" className="text-white font-bold hover:text-indigo-400 transition-colors">Create Account</Link>
        </p>
      </motion.div>
    </div>
  );
}
