import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthLogout } from './hooks/useAuthLogout';
import useAuthStore from './store/authStore';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ClassDetail from './pages/ClassDetail';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import Register from './pages/Register';

function RequireUploader({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'UPLOADER') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  useAuthLogout();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/class/:id"     element={<ClassDetail />} />
          <Route path="/dashboard"     element={<RequireUploader><Dashboard /></RequireUploader>} />
          <Route path="/admin/users"   element={<RequireUploader><AdminUsers /></RequireUploader>} />
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
