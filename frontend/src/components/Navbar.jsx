import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand-600 text-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            DocShare
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user.name}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                    user.role === 'UPLOADER'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>{user.role}</span>
                </span>
                {user.role === 'UPLOADER' && (
                  <Link to="/dashboard" className="btn-secondary text-xs px-3 py-1.5">
                    Dashboard
                  </Link>
                )}
                <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary text-xs px-3 py-1.5">Login</Link>
                <Link to="/register" className="btn-primary text-xs px-3 py-1.5">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
