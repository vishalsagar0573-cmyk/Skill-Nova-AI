import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ProfileForm from './pages/ProfileForm';

function App() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/20 rounded-full blur-[100px] z-0"></div>
      
      <div className="z-10 relative">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<ProfileForm />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
