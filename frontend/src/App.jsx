import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ProfileForm from './pages/ProfileForm';
import StudentProfile from './pages/StudentProfile';
import CompetencyProfile from './pages/CompetencyProfile';
import JobCompatibility from './pages/JobCompatibility';
import SkillGap from './pages/SkillGap';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Component to redirect authenticated users away from login/register
const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/20 rounded-full blur-[100px] z-0"></div>
        
        <div className="z-10 relative">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<ProfileForm />} />
                <Route path="/student-profile" element={<StudentProfile />} />
                <Route path="/competency-profile" element={<CompetencyProfile />} />
                <Route path="/job-compatibility" element={<JobCompatibility />} />
                <Route path="/skill-gap" element={<SkillGap />} />
              </Route>
            </Routes>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
