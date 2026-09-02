import { Link } from 'react-router-dom';
import { BrainCircuit, UserCircle, LogOut } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="glass sticky top-0 z-50 p-4 shadow-lg border-b border-white/5">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 text-2xl font-bold">
          <BrainCircuit className="text-primary h-8 w-8" />
          <span className="gradient-text tracking-wide">SkillNova AI</span>
        </Link>
        <div className="flex gap-8 items-center text-sm font-medium">
          {user ? (
            <>
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
              <Link to="/student-profile" className="text-gray-300 hover:text-white transition-colors">Student Profile</Link>
              <Link to="/profile" className="text-gray-300 hover:text-white transition-colors">Upload Resume</Link>
              <Link to="/competency-profile" className="text-gray-300 hover:text-white transition-colors">Competency Profile</Link>
              <Link to="/job-compatibility" className="text-gray-300 hover:text-white transition-colors">Job Compatibility</Link>
              <Link to="/skill-gap" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">Skill Gap</Link>
              
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-indigo-400" />
                  <span className="text-white font-bold">{user.full_name}</span>
                </div>
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors font-bold">Login</Link>
              <Link to="/register" className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-full transition-all font-bold shadow-lg shadow-indigo-500/25">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
