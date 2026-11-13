import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProfileForm from './pages/ProfileForm';
import StudentProfile from './pages/StudentProfile';
import CompetencyProfile from './pages/CompetencyProfile';
import CareerPrediction from './pages/CareerPrediction';
import JobCompatibility from './pages/JobCompatibility';
import SkillGap from './pages/SkillGap';
import LearningPath from './pages/LearningPath';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';

// Component to redirect authenticated users away from login/register
const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public Routes with Minimal Theme-Aware Public Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          </Route>

          {/* Authenticated Routes with Sidebar + TopHeader AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<ProfileForm />} />
              <Route path="/student-profile" element={<StudentProfile />} />
              <Route path="/competency-profile" element={<CompetencyProfile />} />
              <Route path="/career-prediction" element={<CareerPrediction />} />
              <Route path="/job-compatibility" element={<JobCompatibility />} />
              <Route path="/skill-gap" element={<SkillGap />} />
              <Route path="/learning-path" element={<LearningPath />} />
            </Route>
          </Route>

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
