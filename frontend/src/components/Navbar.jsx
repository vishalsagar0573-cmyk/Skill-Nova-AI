import { Link } from 'react-router-dom';
import { BrainCircuit, UserCircle } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 p-4 shadow-lg border-b border-white/5">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 text-2xl font-bold">
          <BrainCircuit className="text-primary h-8 w-8" />
          <span className="gradient-text tracking-wide">SkillNova AI</span>
        </Link>
        <div className="flex gap-8 items-center text-sm font-medium">
          <Link to="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
          <Link to="/profile" className="text-gray-300 hover:text-white transition-colors">Profile & Resume</Link>
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all">
            <UserCircle className="w-5 h-5" />
            <span>John Doe</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
